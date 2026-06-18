import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';

export class EquipamentosService {
  async listar(params: PaginationInput & { tipo?: string; status?: string; revisoesVencendo?: boolean }) {
    const { page, perPage, search, tipo, status, revisoesVencendo } = params;
    const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.EquipamentoWhereInput = status === 'descartado' ? { ativo: false } : { ativo: true };
    if (revisoesVencendo) {
      where.proximaRevisao = { lte: em30Dias };
      where.status = { not: 'descartado' };
    } else if (tipo) {
      where.tipo = tipo;
    }
    if (!revisoesVencendo && status) where.status = status;
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { numeroSerie: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [equipamentos, total] = await Promise.all([
      prisma.equipamento.findMany({
        where,
        include: {
          responsavel: { select: { id: true, nome: true, cargo: true } },
        },
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.equipamento.count({ where }),
    ]);

    return { equipamentos, total };
  }

  async buscar(id: string) {
    return prisma.equipamento.findUniqueOrThrow({
      where: { id },
      include: {
        responsavel: { select: { id: true, nome: true, cargo: true, telefone: true } },
        movimentacoes: {
          include: { responsavel: { select: { id: true, nome: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async criar(data: {
    nome: string;
    tipo: string;
    descricao?: string;
    numeroSerie?: string;
    responsavelId?: string;
    localizacao?: string;
    dataAquisicao?: string;
    valorAquisicao?: number;
    fabricante?: string;
    modelo?: string;
    proximaRevisao?: string;
    observacoes?: string;
  }) {
    const prefixos: Record<string, string> = {
      equipamento: 'EQP',
      ferramenta: 'FER',
      veiculo_apoio: 'VAP',
    };
    const prefixo = prefixos[data.tipo] ?? 'EQP';

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const last = await prisma.equipamento.findFirst({
        where: { codigo: { startsWith: prefixo } },
        orderBy: { codigo: 'desc' },
      });
      const nextNum = last ? (parseInt(last.codigo.split('-')[1] ?? '0', 10) || 0) + 1 : 1;
      const codigo = `${prefixo}-${String(nextNum).padStart(3, '0')}`;

      try {
        const equipamento = await prisma.equipamento.create({
          data: {
            codigo,
            nome: data.nome,
            tipo: data.tipo,
            descricao: data.descricao ?? null,
            numeroSerie: data.numeroSerie ?? null,
            responsavelId: data.responsavelId ?? null,
            localizacao: data.localizacao ?? null,
            dataAquisicao: data.dataAquisicao ? new Date(data.dataAquisicao) : null,
            valorAquisicao: data.valorAquisicao ?? null,
            fabricante: data.fabricante ?? null,
            modelo: data.modelo ?? null,
            proximaRevisao: data.proximaRevisao ? new Date(data.proximaRevisao) : null,
            observacoes: data.observacoes ?? null,
          },
          include: { responsavel: { select: { id: true, nome: true } } },
        });
        logger.info(`Equipamento criado: ${codigo} — ${data.nome}`);
        return equipamento;
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para o equipamento');
  }

  async atualizar(id: string, data: {
    nome?: string;
    status?: string;
    responsavelId?: string | null;
    localizacao?: string | null;
    proximaRevisao?: string | null;
    observacoes?: string | null;
    ativo?: boolean;
  }) {
    const equipamento = await prisma.equipamento.update({
      where: { id },
      data: {
        ...data,
        ativo: data.status === 'descartado' ? false : data.ativo,
        proximaRevisao: (data.proximaRevisao === null || data.proximaRevisao === '')
          ? null
          : data.proximaRevisao
            ? new Date(data.proximaRevisao)
            : undefined,
        localizacao: (data.localizacao === null || data.localizacao === '') ? null : data.localizacao,
        observacoes: (data.observacoes === null || data.observacoes === '') ? null : data.observacoes,
      },
      include: { responsavel: { select: { id: true, nome: true } } },
    });

    logger.info(`Equipamento atualizado: ${equipamento.codigo}`);
    return equipamento;
  }

  async registrarMovimentacao(equipamentoId: string, data: {
    tipo: string;
    responsavelId: string;
    destino?: string;
    observacoes?: string;
    novoStatus?: string;
  }) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const mov = await tx.movimentacaoEquipamento.create({
        data: {
          equipamentoId,
          tipo: data.tipo,
          responsavelId: data.responsavelId,
          destino: data.destino ?? null,
          observacoes: data.observacoes ?? null,
        },
        include: {
          responsavel: { select: { id: true, nome: true } },
        },
      });

      if (data.novoStatus) {
        await tx.equipamento.update({
          where: { id: equipamentoId },
          data: {
            status: data.novoStatus,
            ativo: data.novoStatus === 'descartado' ? false : undefined,
            responsavelId: data.tipo === 'retirada' ? data.responsavelId
              : data.tipo === 'devolucao' ? null
              : undefined,
          },
        });
      }

      return mov;
    });
  }

}
