import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import type { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class FrotaService {
  async listarCaminhoes(params: PaginationInput & { status?: string; manutencaoVencida?: boolean }) {
    const { page, perPage, search, status, manutencaoVencida } = params;

    const where: Prisma.CaminhaoWhereInput = {};
    if (manutencaoVencida) {
      where.proximaManutencao = { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      where.status = 'operacional';
    } else if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { placa: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [caminhoes, total] = await Promise.all([
      prisma.caminhao.findMany({
        where,
        include: {
          motorista: { select: { id: true, nome: true, cnhCategoria: true, telefone: true } },
          _count: {
            select: {
              ordensServico: { where: { status: { notIn: ['concluida', 'cancelada'] } } },
              abastecimentos: true,
            },
          },
        },
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.caminhao.count({ where }),
    ]);

    return { caminhoes, total };
  }


  async buscarCaminhao(id: string) {
    const [caminhao, custoOS, custoCombus] = await Promise.all([
      prisma.caminhao.findUniqueOrThrow({
        where: { id },
        include: {
          motorista: true,
          ordensServico: {
            orderBy: { dataAbertura: 'desc' },
            take: 10,
            include: { responsavel: { select: { id: true, nome: true } } },
          },
          abastecimentos: {
            orderBy: { data: 'desc' },
            take: 10,
            include: { motorista: { select: { id: true, nome: true } } },
          },
          kmRegistros: { orderBy: { data: 'desc' }, take: 20 },
        },
      }),
      prisma.ordemServico.aggregate({
        where: { caminhaoId: id, status: 'concluida' },
        _sum: { custoTotal: true },
        _count: true,
      }),
      prisma.abastecimento.findMany({
        where: { caminhaoId: id },
        select: { litros: true, precoLitro: true },
      }),
    ]);

    const custoTotalCombustivel = custoCombus.reduce(
      (sum: number, ab: { litros: number; precoLitro: number }) => sum + ab.litros * ab.precoLitro, 0
    );
    const litrosTotais = custoCombus.reduce((sum: number, ab: { litros: number }) => sum + ab.litros, 0);
    const custoTotalOS = custoOS._sum.custoTotal ?? 0;

    return {
      ...caminhao,
      custos: {
        totalOS: custoOS._count,
        custoTotalOS: Math.round(custoTotalOS * 100) / 100,
        totalAbastecimentos: custoCombus.length,
        litrosTotais: Math.round(litrosTotais * 10) / 10,
        custoTotalCombustivel: Math.round(custoTotalCombustivel * 100) / 100,
        custoTotal: Math.round((custoTotalOS + custoTotalCombustivel) * 100) / 100,
      },
    };
  }

  async criarCaminhao(data: {
    placa: string;
    chassi: string;
    modelo: string;
    fabricante: string;
    anoFabricacao: number;
    kmAtual: number;
    motoristaId?: string | null;
    proximaManutencao?: string | null;
  }) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const last = await prisma.caminhao.findFirst({ orderBy: { codigo: 'desc' } });
      const nextNum = last ? (parseInt(last.codigo.split('-')[1] ?? '0', 10) || 0) + 1 : 1;
      const codigo = `CAM-${String(nextNum).padStart(3, '0')}`;

      try {
        const caminhao = await prisma.caminhao.create({
          data: {
            codigo,
            placa: data.placa,
            chassi: data.chassi,
            modelo: data.modelo,
            fabricante: data.fabricante,
            anoFabricacao: data.anoFabricacao,
            kmAtual: data.kmAtual,
            motoristaId: data.motoristaId ?? null,
            proximaManutencao: data.proximaManutencao ? new Date(data.proximaManutencao) : null,
          },
          include: { motorista: true },
        });
        logger.info(`Caminhão criado: ${codigo} — ${data.modelo} ${data.placa}`);
        return caminhao;
      } catch (e) {
        const p = e as { code?: string; meta?: { target?: string[] } };
        if (p.code === 'P2002') {
          if (p.meta?.target?.includes('codigo') && tentativa < 2) continue;
        }
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para o caminhão');
  }
  async atualizarCaminhao(id: string, data: {
    modelo?: string;
    fabricante?: string;
    kmAtual?: number;
    motoristaId?: string | null;
    proximaManutencao?: string | null;
    vencimentoCrlv?: string | null;
    vencimentoSeguro?: string | null;
    numeroSeguro?: string | null;
    proximaManutencaoKm?: number | null;
    status?: string;
  }) {
    const toDate = (v: string | null | undefined) =>
      v === null ? null : v ? new Date(v) : undefined;

    const caminhao = await prisma.caminhao.update({
      where: { id },
      data: {
        modelo: data.modelo,
        fabricante: data.fabricante,
        kmAtual: data.kmAtual,
        motoristaId: data.motoristaId,
        status: data.status,
        proximaManutencao: toDate(data.proximaManutencao),
        proximaManutencaoKm: data.proximaManutencaoKm,
        vencimentoCrlv: toDate(data.vencimentoCrlv),
        vencimentoSeguro: toDate(data.vencimentoSeguro),
        numeroSeguro: data.numeroSeguro === null ? null : data.numeroSeguro ?? undefined,
      },
      include: { motorista: true },
    });

    logger.info(`Caminhão atualizado: ${caminhao.codigo}`);
    return caminhao;
  }

  async atualizarStatus(id: string, status: string) {
    const caminhao = await prisma.caminhao.update({
      where: { id },
      data: { status },
    });
    logger.info(`Status do caminhão ${caminhao.codigo} atualizado para: ${status}`);
    return caminhao;
  }

  async registrarKm(id: string, km: number) {
    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      const caminhao = await tx.caminhao.findUniqueOrThrow({ where: { id } });
      if (km <= caminhao.kmAtual) throw new AppError(`KM deve ser maior que o atual (${caminhao.kmAtual} km)`, 422);

      const [registro] = await Promise.all([
        tx.kmRegistro.create({ data: { caminhaoId: id, km } }),
        tx.caminhao.update({ where: { id }, data: { kmAtual: km } }),
      ]);

      // A7 — Verifica manutenção por km
      const manutencaoNecessariaKm =
        caminhao.proximaManutencaoKm !== null &&
        caminhao.proximaManutencaoKm !== undefined &&
        km >= caminhao.proximaManutencaoKm;

      if (manutencaoNecessariaKm) {
        logger.info(`Alerta km: caminhão ${caminhao.codigo} atingiu ${km} km — manutenção prevista aos ${caminhao.proximaManutencaoKm} km`);
      }

      return { ...registro, manutencaoNecessariaKm, kmAtual: km };
    });

    logger.info(`KM registrado para caminhão ${id}: ${km} km`);
    return result;
  }

}







