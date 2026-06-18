import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import type { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class FuncionariosService {
  async listar(params: PaginationInput & { cargo?: string; ativo?: boolean; cnhAlerta?: boolean }) {
    const { page, perPage, search, cargo, cnhAlerta } = params;
    const ativo = params.ativo !== undefined ? params.ativo : true;

    const where: Prisma.FuncionarioWhereInput = { ativo };

    if (cnhAlerta) {
      where.cargo = 'motorista';
      where.cnhValidade = { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    } else if (cargo) {
      where.cargo = cargo;
    }
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [funcionarios, total] = await Promise.all([
      prisma.funcionario.findMany({
        where,
        include: {
          user: { select: { id: true, role: true, email: true } },
          _count: { select: { caminhoesMotorista: true, ordensResponsavel: true } },
        },
        orderBy: { nome: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.funcionario.count({ where }),
    ]);

    return { funcionarios, total };
  }

  async buscar(id: string) {
    return prisma.funcionario.findUniqueOrThrow({
      where: { id },
      include: {
        user: { select: { id: true, role: true, email: true } },
        caminhoesMotorista: { select: { id: true, codigo: true, placa: true, modelo: true, status: true } },
        ordensResponsavel: {
          orderBy: { dataAbertura: 'desc' },
          take: 10,
          select: {
            id: true, codigo: true, tipo: true, status: true, dataAbertura: true,
            caminhao: { select: { id: true, codigo: true } },
          },
        },
      },
    });
  }

  async criar(data: {
    nome: string;
    cpf: string;
    cargo: string;
    cnhCategoria?: string;
    cnhValidade?: string;
    telefone: string;
    email: string;
  }) {
    const existente = await prisma.funcionario.findUnique({ where: { cpf: data.cpf } });
    if (existente) throw new AppError('CPF já cadastrado', 409);

    const emailExistente = await prisma.funcionario.findFirst({ where: { email: data.email } });
    if (emailExistente) throw new AppError('E-mail já cadastrado', 409);

    const funcionario = await prisma.funcionario.create({
      data: {
        nome: data.nome,
        cpf: data.cpf,
        cargo: data.cargo,
        cnhCategoria: data.cnhCategoria ?? null,
        cnhValidade: data.cnhValidade ? new Date(data.cnhValidade) : null,
        telefone: data.telefone,
        email: data.email,
      },
    });

    logger.info(`Funcionário criado: ${funcionario.nome} — ${funcionario.cargo}`);
    return funcionario;
  }

  async atualizar(id: string, data: {
    nome?: string;
    cargo?: string;
    cnhCategoria?: string | null;
    cnhValidade?: string | null;
    telefone?: string;
    email?: string;
    ativo?: boolean;
  }) {
    if (data.email) {
      const emailConflito = await prisma.funcionario.findFirst({ where: { email: data.email, id: { not: id } } });
      if (emailConflito) throw new AppError('E-mail já cadastrado para outro funcionário', 409);
    }

    const funcionario = await prisma.funcionario.update({
      where: { id },
      data: {
        ...data,
        cnhValidade: data.cnhValidade === null ? null : data.cnhValidade ? new Date(data.cnhValidade) : undefined,
      },
    });

    logger.info(`Funcionário atualizado: ${funcionario.nome}`);
    return funcionario;
  }

}
