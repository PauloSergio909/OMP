import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import type { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class ComprasService {
  async listar(params: PaginationInput & { status?: string; search?: string; dataDe?: string; dataAte?: string; atrasada?: boolean }) {
    const { page, perPage, status, search, dataDe, dataAte, atrasada } = params;

    const where: Prisma.OrdemCompraWhereInput = {};
    if (atrasada) {
      where.dataEntrega = { lt: new Date() };
      where.status = { notIn: ['recebida', 'cancelada'] };
    } else if (status) {
      where.status = status;
    }
    if (dataDe || dataAte) {
      const dateFilter: Prisma.DateTimeFilter<'OrdemCompra'> = {};
      if (dataDe) dateFilter.gte = new Date(dataDe);
      if (dataAte) {
        const ate = new Date(dataAte);
        ate.setHours(23, 59, 59, 999);
        dateFilter.lte = ate;
      }
      where.dataPedido = dateFilter;
    }
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { fornecedor: { razaoSocial: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [compras, total] = await Promise.all([
      prisma.ordemCompra.findMany({
        where,
        include: {
          fornecedor: { select: { id: true, razaoSocial: true, cnpj: true } },
          itens: {
            include: { material: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } } },
          },
        },
        orderBy: { dataPedido: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.ordemCompra.count({ where }),
    ]);

    return { compras, total };
  }

  async buscar(id: string) {
    return prisma.ordemCompra.findUniqueOrThrow({
      where: { id },
      include: {
        fornecedor: true,
        itens: {
          include: { material: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } } },
        },
      },
    });
  }

  async criar(data: {
    fornecedorId: string;
    dataEntrega?: string;
    observacoes?: string;
    itens: { materialId: string; quantidade: number; precoUnitario: number }[];
  }) {
    const valorTotal = data.itens.reduce(
      (sum, item) => sum + item.quantidade * item.precoUnitario,
      0,
    );

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const lastOC = await prisma.ordemCompra.findFirst({ orderBy: { codigo: 'desc' } });
      const year = new Date().getFullYear();
      const lastNum = lastOC ? (parseInt(lastOC.codigo.split('-')[2] ?? '0', 10) || 0) : 0;
      const codigo = `OC-${year}-${String(lastNum + 1).padStart(3, '0')}`;

      try {
        const compra = await prisma.ordemCompra.create({
          data: {
            codigo,
            fornecedorId: data.fornecedorId,
            valorTotal,
            dataEntrega: data.dataEntrega ? new Date(data.dataEntrega) : null,
            observacoes: data.observacoes,
            itens: {
              create: data.itens.map((item) => ({
                materialId: item.materialId,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario,
              })),
            },
          },
          include: {
            fornecedor: { select: { id: true, razaoSocial: true } },
            itens: { include: { material: { select: { id: true, nome: true, codigo: true } } } },
          },
        });

        logger.info(`Ordem de compra criada: ${codigo} — Fornecedor: ${compra.fornecedor.razaoSocial}`);
        return compra;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para a ordem de compra');
  }

  async atualizar(id: string, data: { dataEntrega?: string | null; observacoes?: string | null }) {
    const compra = await prisma.ordemCompra.findUniqueOrThrow({ where: { id } });
    if (compra.status !== 'pendente') {
      throw new AppError('Apenas ordens de compra pendentes podem ser editadas', 422);
    }

    return prisma.ordemCompra.update({
      where: { id },
      data: {
        ...(Object.prototype.hasOwnProperty.call(data, 'dataEntrega') && {
          dataEntrega: data.dataEntrega ? new Date(data.dataEntrega) : null,
        }),
        ...(Object.prototype.hasOwnProperty.call(data, 'observacoes') && {
          observacoes: (data.observacoes === null || data.observacoes === '') ? null : data.observacoes,
        }),
      },
      include: {
        fornecedor: true,
        itens: {
          include: { material: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } } },
        },
      },
    });
  }

  async atualizarStatus(id: string, status: string, userId: string) {
    const compra = await prisma.ordemCompra.findUniqueOrThrow({
      where: { id },
      include: { itens: true },
    });

    const transicoesValidas: Record<string, string[]> = {
      pendente: ['aprovada', 'cancelada'],
      aprovada: ['recebida', 'cancelada'],
      recebida: [],
      cancelada: [],
    };

    const permitidas = transicoesValidas[compra.status] ?? [];
    if (!permitidas.includes(status)) {
      throw new AppError(`Transição inválida: ${compra.status} → ${status}`, 422);
    }

    const updated = await prisma.$transaction(async (tx: PrismaTx) => {
      const result = await tx.ordemCompra.update({
        where: { id },
        data: { status, ...(status === 'recebida' ? { dataRecebimento: new Date() } : {}) },
        include: { fornecedor: { select: { id: true, razaoSocial: true } } },
      });

      if (status === 'recebida') {
        for (const item of compra.itens) {
          await tx.estoque.upsert({
            where: { materialId: item.materialId },
            update: {
              quantidade: { increment: item.quantidade },
              ultimaAtualizacao: new Date(),
            },
            create: {
              materialId: item.materialId,
              quantidade: item.quantidade,
              ultimaAtualizacao: new Date(),
            },
          });

          await tx.movimentacao.create({
            data: {
              materialId: item.materialId,
              tipo: 'entrada',
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              motivo: `Recebimento OC ${compra.codigo}`,
              usuarioId: userId,
            },
          });

          await tx.material.update({
            where: { id: item.materialId },
            data: { precoUnitario: item.precoUnitario },
          });
        }
      }

      return result;
    });

    logger.info(`OC ${compra.codigo} → ${status}`);
    return updated;
  }

  async adicionarItem(ocId: string, item: { materialId: string; quantidade: number; precoUnitario: number }) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const oc = await tx.ordemCompra.findUniqueOrThrow({ where: { id: ocId }, select: { status: true } });
      if (oc.status !== 'pendente') {
        throw new AppError('Itens só podem ser adicionados em ordens pendentes', 422);
      }

      const novoItem = await tx.itemCompra.create({
        data: { ordemCompraId: ocId, ...item },
        include: { material: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } } },
      });

      await this.recalcularValorTotal(tx, ocId);
      return novoItem;
    });
  }

  async removerItem(itemId: string) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const item = await tx.itemCompra.findUniqueOrThrow({ where: { id: itemId }, select: { ordemCompraId: true } });
      const oc = await tx.ordemCompra.findUniqueOrThrow({ where: { id: item.ordemCompraId }, select: { status: true } });
      if (oc.status !== 'pendente') {
        throw new AppError('Itens só podem ser removidos de ordens pendentes', 422);
      }

      await tx.itemCompra.delete({ where: { id: itemId } });
      await this.recalcularValorTotal(tx, item.ordemCompraId);
    });
  }

  private async recalcularValorTotal(tx: PrismaTx, ocId: string) {
    const itens = await tx.itemCompra.findMany({ where: { ordemCompraId: ocId } });
    const valorTotal = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    await tx.ordemCompra.update({ where: { id: ocId }, data: { valorTotal } });
  }

}
