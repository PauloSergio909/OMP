import { prisma } from '../../config/database';

export class OsAnalyticsService {
  async tempoMedioResolucao() {
    type Row = { media_dias: number | null; total: number };
    const [rows] = await Promise.all([
      prisma.$queryRaw<Row[]>`
        SELECT
          AVG(EXTRACT(EPOCH FROM (data_conclusao - data_abertura)) / 86400.0)::float AS media_dias,
          COUNT(*)::int AS total
        FROM ordens_servico
        WHERE status = 'concluida'
          AND data_conclusao IS NOT NULL
          AND data_abertura IS NOT NULL
      `,
    ]);

    const row = rows[0];
    const mediaDias = row?.media_dias ?? null;

    type RowTipo = { tipo: string; media: number | null; total: number };
    const porTipo = await prisma.$queryRaw<RowTipo[]>`
      SELECT tipo,
             AVG(EXTRACT(EPOCH FROM (data_conclusao - data_abertura)) / 86400.0)::float AS media,
             COUNT(*)::int AS total
      FROM ordens_servico
      WHERE status = 'concluida'
        AND data_conclusao IS NOT NULL
      GROUP BY tipo
    `;

    return {
      mediaDias: mediaDias !== null ? +mediaDias.toFixed(1) : null,
      totalConcluidas: row?.total ?? 0,
      porTipo: porTipo.map((r) => ({
        tipo: r.tipo,
        mediaDias: r.media !== null ? +r.media.toFixed(1) : null,
        total: r.total,
      })),
    };
  }

  async porStatus() {
    const statuses = ['orcamento', 'agendada', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada'];
    const counts = await Promise.all(
      statuses.map((s) => prisma.ordemServico.count({ where: { status: s } }))
    );
    return statuses.map((s, i) => ({ status: s, total: counts[i] }));
  }

  async getKPIs() {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioPrevMes = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fimPrevMes = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [abertas, urgentes, atrasadas, concluidasMes, custoMes, concluidasPrevMes, custoPrevMes] = await Promise.all([
      prisma.ordemServico.count({ where: { status: { notIn: ['concluida', 'cancelada'] } } }),
      prisma.ordemServico.count({
        where: { prioridade: 'critica', status: { notIn: ['concluida', 'cancelada'] } },
      }),
      prisma.ordemServico.count({
        where: { status: { notIn: ['concluida', 'cancelada', 'orcamento'] }, dataPrevisao: { lt: now } },
      }),
      prisma.ordemServico.count({
        where: { status: 'concluida', dataConclusao: { gte: inicioMes } },
      }),
      prisma.ordemServico.aggregate({
        where: { status: 'concluida', dataConclusao: { gte: inicioMes } },
        _sum: { custoTotal: true },
      }),
      prisma.ordemServico.count({
        where: { status: 'concluida', dataConclusao: { gte: inicioPrevMes, lte: fimPrevMes } },
      }),
      prisma.ordemServico.aggregate({
        where: { status: 'concluida', dataConclusao: { gte: inicioPrevMes, lte: fimPrevMes } },
        _sum: { custoTotal: true },
      }),
    ]);

    const [preventivas, corretivas] = await Promise.all([
      prisma.ordemServico.count({ where: { tipo: 'preventiva', dataAbertura: { gte: inicioMes } } }),
      prisma.ordemServico.count({ where: { tipo: 'corretiva', dataAbertura: { gte: inicioMes } } }),
    ]);

    const totalTipo = preventivas + corretivas;

    return {
      abertas,
      urgentes,
      atrasadas,
      concluidasMes,
      custoMes: custoMes._sum.custoTotal ?? 0,
      concluidasMesAnterior: concluidasPrevMes,
      custoMesAnterior: custoPrevMes._sum.custoTotal ?? 0,
      preventivas,
      corretivas,
      taxaPreventiva: totalTipo > 0 ? +((preventivas / totalTipo) * 100).toFixed(1) : 0,
    };
  }

  async osPorMecanico() {
    const dados = await prisma.ordemServico.groupBy({
      by: ['responsavelId', 'status'],
      _count: { _all: true },
    });

    const responsavelIds = [...new Set(dados.map((d) => d.responsavelId).filter(Boolean))];
    if (responsavelIds.length === 0) return [];

    const responsaveis = await prisma.funcionario.findMany({
      where: { id: { in: responsavelIds as string[] } },
      select: { id: true, nome: true, cargo: true },
    });

    const statusAbertos = ['orcamento', 'agendada', 'em_andamento', 'aguardando_peca'];

    const responsavelMap = new Map(responsaveis.map((r) => [r.id, r]));
    const dadosPorResponsavel = new Map<string, typeof dados>();
    for (const d of dados) {
      if (!d.responsavelId) continue;
      const arr = dadosPorResponsavel.get(d.responsavelId) ?? [];
      arr.push(d);
      dadosPorResponsavel.set(d.responsavelId, arr);
    }

    return responsavelIds
      .map((id) => {
        const resp = responsavelMap.get(id as string);
        const entries = dadosPorResponsavel.get(id as string) ?? [];
        const abertas = entries.filter((d) => statusAbertos.includes(d.status)).reduce((s, d) => s + d._count._all, 0);
        const concluidas = entries.find((d) => d.status === 'concluida')?._count._all ?? 0;
        const total = entries.reduce((s, d) => s + d._count._all, 0);
        return { id, nome: resp?.nome ?? (id as string), cargo: resp?.cargo ?? '', abertas, concluidas, total };
      })
      .sort((a, b) => b.total - a.total);
  }

  async tendenciaMensal(meses = 6) {
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth() - (meses - 1), 1);
    const fim = new Date();

    type AbertasRow = { mes_inicio: Date; total: number };
    type ConcluidasRow = { mes_inicio: Date; total: number; custo: number };

    const [abertasRows, concluidasRows] = await Promise.all([
      prisma.$queryRaw<AbertasRow[]>`
        SELECT DATE_TRUNC('month', data_abertura) AS mes_inicio, COUNT(*)::int AS total
        FROM ordens_servico
        WHERE data_abertura >= ${inicio} AND data_abertura <= ${fim}
        GROUP BY DATE_TRUNC('month', data_abertura)
      `,
      prisma.$queryRaw<ConcluidasRow[]>`
        SELECT DATE_TRUNC('month', data_conclusao) AS mes_inicio, COUNT(*)::int AS total,
               COALESCE(SUM(custo_total), 0)::float AS custo
        FROM ordens_servico
        WHERE status = 'concluida' AND data_conclusao >= ${inicio} AND data_conclusao <= ${fim}
        GROUP BY DATE_TRUNC('month', data_conclusao)
      `,
    ]);

    const abertasMap = new Map<string, number>(
      abertasRows.map((r) => [new Date(r.mes_inicio).toISOString().substring(0, 7), r.total]),
    );
    const concluidasMap = new Map<string, ConcluidasRow>(
      concluidasRows.map((r) => [new Date(r.mes_inicio).toISOString().substring(0, 7), r]),
    );

    return Array.from({ length: meses }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - (meses - 1 - i), 1);
      const key = d.toISOString().substring(0, 7);
      const concRow = concluidasMap.get(key);
      return {
        mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        abertas: abertasMap.get(key) ?? 0,
        concluidas: concRow?.total ?? 0,
        custo: Math.round((concRow?.custo ?? 0) * 100) / 100,
      };
    });
  }

  async custoPorCaminhao() {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const dados = await prisma.ordemServico.groupBy({
      by: ['caminhaoId', 'tipo'],
      where: { status: 'concluida', dataConclusao: { gte: inicioMes } },
      _sum: { custoTotal: true },
    });

    const caminhaoIds = [...new Set(dados.map((d) => d.caminhaoId))];
    if (caminhaoIds.length === 0) return [];

    const caminhoes = await prisma.caminhao.findMany({
      where: { id: { in: caminhaoIds } },
      select: { id: true, codigo: true, modelo: true },
    });

    const caminhaoMap = new Map(caminhoes.map((c) => [c.id, c]));
    const prevMap = new Map(dados.filter((d) => d.tipo === 'preventiva').map((d) => [d.caminhaoId, d]));
    const corrMap = new Map(dados.filter((d) => d.tipo === 'corretiva').map((d) => [d.caminhaoId, d]));

    return caminhaoIds
      .map((id) => {
        const cam = caminhaoMap.get(id);
        const prev = prevMap.get(id);
        const corr = corrMap.get(id);
        return {
          caminhao: cam?.codigo ?? id,
          modelo: cam?.modelo ?? '',
          preventiva: Math.round(((prev?._sum.custoTotal as number | null) ?? 0) * 100) / 100,
          corretiva: Math.round(((corr?._sum.custoTotal as number | null) ?? 0) * 100) / 100,
        };
      })
      .sort((a, b) => (b.preventiva + b.corretiva) - (a.preventiva + a.corretiva));
  }
}
