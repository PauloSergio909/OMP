import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import { Prisma } from '@prisma/client';
import type {
  PaginationInput,
  CreateFornecedorInput,
  UpdateFornecedorInput,
  CreateCategoriaInput,
  UpdateCategoriaInput,
} from '@fleetmaster/shared';

export class EstoqueCatalogService {
  async listarCategorias() {
    return prisma.categoria.findMany({ orderBy: { nome: 'asc' }, take: 200 });
  }

  async criarCategoria(data: CreateCategoriaInput) {
    const existe = await prisma.categoria.findFirst({ where: { nome: { equals: data.nome, mode: 'insensitive' } } });
    if (existe) throw new AppError('Já existe uma categoria com este nome', 409);
    return prisma.categoria.create({ data });
  }

  async atualizarCategoria(id: string, data: UpdateCategoriaInput) {
    return prisma.categoria.update({ where: { id }, data });
  }

  async listarFornecedores() {
    return prisma.fornecedor.findMany({
      where: { ativo: true },
      select: { id: true, razaoSocial: true, cnpj: true, avaliacao: true },
      orderBy: [{ avaliacao: 'desc' }, { razaoSocial: 'asc' }],
      take: 200,
    });
  }

  async listarFornecedoresPaginado(params: PaginationInput) {
    const { page, perPage, search } = params;
    const where: Prisma.FornecedorWhereInput = {};
    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }
    const [fornecedores, total] = await Promise.all([
      prisma.fornecedor.findMany({
        where,
        orderBy: { razaoSocial: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.fornecedor.count({ where }),
    ]);
    return { fornecedores, total };
  }

  async criarFornecedor(data: CreateFornecedorInput) {
    const existe = await prisma.fornecedor.findFirst({ where: { cnpj: data.cnpj } });
    if (existe) throw new AppError('Já existe um fornecedor com este CNPJ', 409);
    return prisma.fornecedor.create({ data });
  }

  async atualizarFornecedor(id: string, data: UpdateFornecedorInput) {
    return prisma.fornecedor.update({ where: { id }, data });
  }
}
