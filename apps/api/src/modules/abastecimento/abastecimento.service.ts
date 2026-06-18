import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import type { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class AbastecimentoService {
  async listar(params: PaginationInput & { caminhaoId?: string; motoristaId?: string; dataDe?: string; dataAte?: string; search?: string; combustivel?: string }) {
    const { page, perPage, caminhaoId, motoristaId, dataDe, dataAte, search, combustivel } = params;

    const where: Prisma.AbastecimentoWhereInput = {};
    if (caminhaoId) where.caminhaoId = caminhaoId;
    if (motoristaId) where.motoristaId = motoristaId;
    if (combustivel) where.combustivel = combustivel;
    if (dataDe || dataAte) {
      where.data = {};
      if (dataDe) where.data.gte = new Date(dataDe);
      if (dataAte) {
        const ate = new Date(dataAte);
        ate.setHours(23, 59, 59, 999);
        where.data.lte = ate;
      }
    }
    if (search) {
      where.OR = [
        { posto: { contains: search, mode: 'insensitive' } },
        { caminhao: { OR: [
          { codigo: { contains: search, mode: 'insensitive' } },
          { placa: { contains: search, mode: 'insensitive' } },
        ]}},
        { motorista: { nome: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [abastecimentos, total] = await Promise.all([
      prisma.abastecimento.findMany({
        where,
        include: {
          caminhao: { select: { id: true, codigo: true, placa: true, modelo: true } },
          motorista: { select: { id: true, nome: true } },
        },
        orderBy: { data: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.abastecimento.count({ where }),
    ]);

    return { abastecimentos, total };
  }

  async registrar(data: {
    caminhaoId: string;
    motoristaId: string;
    litros: number;
    precoLitro: number;
    kmAtual: number;
    combustivel: string;
    posto: string;
    data?: string;
  }) {
    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      const caminhao = await tx.caminhao.findUniqueOrThrow({ where: { id: data.caminhaoId }, select: { kmAtual: true, codigo: true } });
      if (data.kmAtual <= caminhao.kmAtual) {
        throw new AppError(`KM deve ser maior que o atual (${caminhao.kmAtual} km)`, 422);
      }

      const kmPercorridos = data.kmAtual - caminhao.kmAtual;
      const kmL = kmPercorridos > 0 ? Math.round((kmPercorridos / data.litros) * 100) / 100 : null;

      const abastecimento = await tx.abastecimento.create({
        data: {
          caminhaoId: data.caminhaoId,
          motoristaId: data.motoristaId,
          litros: data.litros,
          precoLitro: data.precoLitro,
          kmAtual: data.kmAtual,
          combustivel: data.combustivel,
          posto: data.posto,
          data: data.data ? new Date(data.data) : new Date(),
        },
        include: {
          caminhao: { select: { id: true, codigo: true, placa: true } },
          motorista: { select: { id: true, nome: true } },
        },
      });

      await tx.caminhao.update({
        where: { id: data.caminhaoId },
        data: { kmAtual: data.kmAtual },
      });

      await tx.kmRegistro.create({
        data: { caminhaoId: data.caminhaoId, km: data.kmAtual },
      });

      return { ...abastecimento, kmPercorridos, kmL };
    });

    logger.info(`Abastecimento registrado: ${result.caminhao.codigo} — ${data.litros}L — ${result.kmL ? `${result.kmL} km/L` : 'km/L N/A'}`);
    return result;
  }

  async atualizar(id: string, data: {
    litros?: number;
    precoLitro?: number;
    kmAtual?: number;
    combustivel?: string;
    posto?: string;
    motoristaId?: string;
    data?: string;
  }) {
    return prisma.abastecimento.update({
      where: { id },
      data: {
        litros: data.litros,
        precoLitro: data.precoLitro,
        kmAtual: data.kmAtual,
        combustivel: data.combustivel,
        posto: data.posto,
        motoristaId: data.motoristaId,
        data: data.data ? new Date(data.data) : undefined,
      },
      include: {
        caminhao: { select: { id: true, codigo: true, placa: true, modelo: true } },
        motorista: { select: { id: true, nome: true } },
      },
    });
  }

  async remover(id: string) {
    return prisma.abastecimento.delete({ where: { id } });
  }
}
