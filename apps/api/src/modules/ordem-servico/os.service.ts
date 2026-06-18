import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import { Prisma } from '@prisma/client';
import type { PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class OrdemServicoService {
  async listar(params: PaginationInput & { status?: string; tipo?: string; caminhaoId?: string; responsavelId?: string; dataDe?: string; dataAte?: string; search?: string; prioridade?: string; atrasadas?: boolean }) {
    const { page, perPage, status, tipo, caminhaoId, responsavelId, dataDe, dataAte, search, prioridade, atrasadas } = params;

    const where: Prisma.OrdemServicoWhereInput = {};
    if (atrasadas) {
      where.status = { notIn: ['concluida', 'cancelada', 'orcamento'] };
      where.dataPrevisao = { lt: new Date() };
    } else if (status === 'aberta') {
      where.status = { notIn: ['concluida', 'cancelada'] };
    } else if (status) {
      where.status = status;
    }
    if (tipo) where.tipo = tipo;
    if (caminhaoId) where.caminhaoId = caminhaoId;
    if (responsavelId) where.responsavelId = responsavelId;
    if (prioridade) where.prioridade = prioridade;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
        { caminhao: { OR: [
          { codigo: { contains: search, mode: 'insensitive' } },
          { placa: { contains: search, mode: 'insensitive' } },
        ]}},
      ];
    }
    if (dataDe || dataAte) {
      where.dataAbertura = {};
      if (dataDe) where.dataAbertura.gte = new Date(dataDe);
      if (dataAte) {
        const fim = new Date(dataAte);
        fim.setHours(23, 59, 59, 999);
        where.dataAbertura.lte = fim;
      }
    }

    const [ordens, total] = await Promise.all([
      prisma.ordemServico.findMany({
        where,
        include: {
          caminhao: { select: { id: true, codigo: true, placa: true, modelo: true } },
          responsavel: { select: { id: true, nome: true } },
        },
        orderBy: { dataAbertura: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.ordemServico.count({ where }),
    ]);

    return { ordens, total };
  }

  async buscar(id: string) {
    return prisma.ordemServico.findUniqueOrThrow({
      where: { id },
      include: {
        caminhao: true,
        responsavel: true,
        itens: { include: { material: true } },
        movimentacoes: { include: { material: true }, orderBy: { createdAt: 'desc' } },
        historico: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private async proximoCodigoOS(): Promise<string> {
    const year = new Date().getFullYear();
    const lastOS = await prisma.ordemServico.findFirst({
      where: { codigo: { startsWith: `OS-${year}` } },
      orderBy: { codigo: 'desc' },
    });
    const nextNum = lastOS ? (parseInt(lastOS.codigo.split('-')[2] ?? '0', 10) || 0) + 1 : 1;
    return `OS-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  async criar(data: {
    caminhaoId: string;
    tipo: string;
    descricao: string;
    prioridade: string;
    responsavelId: string;
    dataPrevisao: string;
    observacoes?: string;
    criarComoOrcamento?: boolean;
    usuario?: { id: string; nome: string };
  }) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const codigo = await this.proximoCodigoOS();

      try {
        const result = await prisma.$transaction(async (tx: PrismaTx) => {
          const statusInicial = data.criarComoOrcamento ? 'orcamento' : 'agendada';
          const os = await tx.ordemServico.create({
            data: {
              codigo,
              caminhaoId: data.caminhaoId,
              tipo: data.tipo,
              descricao: data.descricao,
              status: statusInicial,
              prioridade: data.prioridade,
              responsavelId: data.responsavelId,
              dataPrevisao: new Date(data.dataPrevisao),
              observacoes: data.observacoes,
            },
            include: {
              caminhao: true,
              responsavel: { select: { id: true, nome: true } },
            },
          });

          if (data.usuario) {
            await tx.historicoOS.create({
              data: {
                ordemServicoId: os.id,
                statusAnterior: null,
                statusNovo: statusInicial,
                usuarioId: data.usuario.id,
                usuarioNome: data.usuario.nome,
                observacao: 'OS criada',
              },
            });
          }

          if (data.tipo === 'corretiva' && !data.criarComoOrcamento) {
            await tx.caminhao.update({
              where: { id: data.caminhaoId },
              data: { status: 'manutencao' },
            });
          }

          return os;
        });

        logger.info(`OS criada: ${codigo} — Caminhão: ${result.caminhao.codigo}`);
        return result;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para a OS');
  }

  async atualizarStatus(id: string, status: string, observacoes?: string, usuario?: { id: string; nome: string }) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const atual = await tx.ordemServico.findUniqueOrThrow({
        where: { id },
        select: { status: true, tipo: true, caminhaoId: true },
      });

      const transicoes: Record<string, string[]> = {
        orcamento:       ['agendada', 'cancelada'],
        agendada:        ['em_andamento', 'cancelada'],
        em_andamento:    ['aguardando_peca', 'concluida', 'cancelada'],
        aguardando_peca: ['em_andamento', 'cancelada'],
        concluida:       [],
        cancelada:       [],
      };
      const permitidas = transicoes[atual.status] ?? [];
      if (!permitidas.includes(status)) {
        throw new AppError(`Transição inválida: ${atual.status} → ${status}`, 422);
      }

      if (usuario) {
        await tx.historicoOS.create({
          data: {
            ordemServicoId: id,
            statusAnterior: atual.status,
            statusNovo: status,
            usuarioId: usuario.id,
            usuarioNome: usuario.nome,
            observacao: observacoes ?? null,
          },
        });
      }

      const updateData: {
        status: string;
        observacoes?: string;
        dataConclusao?: Date;
        custoTotal?: number;
      } = { status };

      if (status === 'concluida') {
        updateData.dataConclusao = new Date();
        const itens = await tx.itemOS.findMany({ where: { ordemServicoId: id } });
        updateData.custoTotal = itens.reduce(
          (sum, item) => sum + item.quantidade * item.precoUnitario,
          0,
        );
      }

      if (observacoes) updateData.observacoes = observacoes;

      // Quando orçamento corretivo é aprovado → agendada, coloca caminhão em manutenção
      if (status === 'agendada' && atual.status === 'orcamento' && atual.tipo === 'corretiva') {
        await tx.caminhao.update({
          where: { id: atual.caminhaoId },
          data: { status: 'manutencao' },
        });
      }

      const os = await tx.ordemServico.update({
        where: { id },
        data: updateData,
        include: { caminhao: true },
      });

      // Quando uma OS é concluída OU cancelada, verifica se há outras OS abertas
      // para o mesmo caminhão. Se não houver, restaura o caminhão para 'operacional'.
      //
      // Bug corrigido #1: antes só rodava em 'concluida'; ao cancelar uma OS corretiva
      // o caminhão ficava preso em 'manutencao' indefinidamente.
      //
      // Bug corrigido #2: usava caminhao.update (lançava P2025 + sobrescrevia 'parado'),
      // agora usa updateMany com status:'manutencao' para não disturbar caminhões
      // que o admin colocou manualmente como 'parado'.
      // A6+A1 — OS preventiva concluída → agenda próxima manutenção por data (+90 dias) e por km (+10.000 km)
      if (status === 'concluida' && atual.tipo === 'preventiva') {
        const proxima = new Date();
        proxima.setDate(proxima.getDate() + 90);
        const caminhaoAtual = await tx.caminhao.findUnique({ where: { id: atual.caminhaoId }, select: { kmAtual: true, codigo: true } });
        await tx.caminhao.update({
          where: { id: atual.caminhaoId },
          data: {
            proximaManutencao: proxima,
            proximaManutencaoKm: caminhaoAtual ? caminhaoAtual.kmAtual + 10000 : undefined,
          },
        });
        logger.info(`Manutenção agendada automaticamente: caminhão ${caminhaoAtual?.codigo} → ${proxima.toLocaleDateString('pt-BR')} ou km ${(caminhaoAtual?.kmAtual ?? 0) + 10000}`);
      }

      if (status === 'concluida' || status === 'cancelada') {
        const outrasOS = await tx.ordemServico.count({
          where: {
            caminhaoId: os.caminhaoId,
            status: { notIn: ['concluida', 'cancelada'] },
            id: { not: id },
          },
        });

        if (outrasOS === 0) {
          await tx.caminhao.updateMany({
            where: { id: os.caminhaoId, status: 'manutencao' },
            data: { status: 'operacional' },
          });
        }
      }

      logger.info(`OS ${id} atualizada para: ${status}`);
      return os;
    });
  }

  async adicionarItem(osId: string, item: {
    materialId?: string;
    quantidade: number;
    precoUnitario: number;
    tipo: string;
    descricao?: string;
  }) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const novoItem = await tx.itemOS.create({
        data: {
          ordemServicoId: osId,
          materialId: item.materialId ?? null,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          tipo: item.tipo,
          descricao: item.descricao ?? null,
        },
        include: { material: true },
      });

      await this.recalcularCustoTotal(tx, osId);
      return novoItem;
    });
  }

  async duplicar(id: string, usuario?: { id: string; nome: string }) {
    const original = await prisma.ordemServico.findUniqueOrThrow({
      where: { id },
      include: { itens: true },
    });

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const codigo = await this.proximoCodigoOS();

      try {
        const nova = await prisma.$transaction(async (tx: PrismaTx) => {
          const os = await tx.ordemServico.create({
            data: {
              codigo,
              caminhaoId: original.caminhaoId,
              tipo: original.tipo,
              descricao: `[Cópia] ${original.descricao}`,
              status: 'agendada',
              prioridade: original.prioridade,
              responsavelId: original.responsavelId,
              dataPrevisao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
              observacoes: original.observacoes ?? undefined,
            },
            include: {
              caminhao: true,
              responsavel: { select: { id: true, nome: true } },
            },
          });

          if (original.itens.length > 0) {
            await tx.itemOS.createMany({
              data: original.itens.map((item) => ({
                ordemServicoId: os.id,
                materialId: item.materialId,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario,
                tipo: item.tipo,
                descricao: item.descricao ?? undefined,
              })),
            });
          }

          if (usuario) {
            await tx.historicoOS.create({
              data: {
                ordemServicoId: os.id,
                statusAnterior: null,
                statusNovo: 'agendada',
                usuarioId: usuario.id,
                usuarioNome: usuario.nome,
                observacao: `Duplicada de ${original.codigo}`,
              },
            });
          }

          return os;
        });

        logger.info(`OS ${original.codigo} duplicada → ${codigo}`);
        return nova;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para a OS duplicada');
  }

  async atualizar(id: string, data: {
    descricao?: string;
    prioridade?: string;
    responsavelId?: string;
    dataPrevisao?: string;
    observacoes?: string | null;
  }) {
    return prisma.ordemServico.update({
      where: { id },
      data: {
        ...data,
        dataPrevisao: data.dataPrevisao ? new Date(data.dataPrevisao) : undefined,
        observacoes: (data.observacoes === null || data.observacoes === '') ? null : data.observacoes,
      },
      include: {
        caminhao: true,
        responsavel: { select: { id: true, nome: true } },
        itens: { include: { material: true } },
      },
    });
  }

  async removerItem(itemId: string) {
    return prisma.$transaction(async (tx: PrismaTx) => {
      const item = await tx.itemOS.findUniqueOrThrow({ where: { id: itemId } });

      await tx.itemOS.delete({ where: { id: itemId } });

      await this.recalcularCustoTotal(tx, item.ordemServicoId);
    });
  }

  private async recalcularCustoTotal(tx: PrismaTx, osId: string) {
    const itens = await tx.itemOS.findMany({ where: { ordemServicoId: osId } });
    const custoTotal = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    await tx.ordemServico.update({ where: { id: osId }, data: { custoTotal } });
  }

}
