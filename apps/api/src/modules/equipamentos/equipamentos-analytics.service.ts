import { prisma } from '../../config/database';

export class EquipamentosAnalyticsService {
  async getKPIs() {
    const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [total, disponiveis, emUso, manutencao, revisaoVencendo, valorTotal] = await Promise.all([
      prisma.equipamento.count({ where: { ativo: true } }),
      prisma.equipamento.count({ where: { status: 'disponivel', ativo: true } }),
      prisma.equipamento.count({ where: { status: 'em_uso', ativo: true } }),
      prisma.equipamento.count({ where: { status: 'manutencao', ativo: true } }),
      prisma.equipamento.count({ where: { proximaRevisao: { lte: em30Dias }, ativo: true } }),
      prisma.equipamento.aggregate({ where: { ativo: true }, _sum: { valorAquisicao: true } }),
    ]);

    return {
      total, disponiveis, emUso, manutencao, revisaoVencendo,
      valorPatrimonio: valorTotal._sum.valorAquisicao ?? 0,
    };
  }

  async revisoesVencendo() {
    const hoje = new Date();
    const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const items = await prisma.equipamento.findMany({
      where: { proximaRevisao: { lte: em30Dias }, ativo: true, status: { not: 'descartado' } },
      select: {
        id: true, codigo: true, nome: true, tipo: true,
        proximaRevisao: true, status: true, responsavelId: true,
        responsavel: { select: { id: true, nome: true } },
      },
      orderBy: { proximaRevisao: 'asc' },
    });

    type ItemRow = (typeof items)[number];
    return items.map((eq: ItemRow) => ({
      ...eq,
      vencida: eq.proximaRevisao ? eq.proximaRevisao < hoje : false,
      diasRestantes: eq.proximaRevisao
        ? Math.ceil((eq.proximaRevisao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }
}
