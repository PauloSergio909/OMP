import { prisma } from '../../config/database';

export class FrotaAnalyticsService {
  async getKPIs() {
    const hoje = new Date();
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [total, operacionais, emManutencao, parados, manutencaoVencendo] = await Promise.all([
      prisma.caminhao.count(),
      prisma.caminhao.count({ where: { status: 'operacional' } }),
      prisma.caminhao.count({ where: { status: 'manutencao' } }),
      prisma.caminhao.count({ where: { status: 'parado' } }),
      prisma.caminhao.count({
        where: {
          proximaManutencao: { lte: em30Dias },
          status: 'operacional',
        },
      }),
    ]);

    return {
      total,
      operacionais,
      emManutencao,
      parados,
      manutencaoVencendo,
      taxaDisponibilidade: total > 0 ? +((operacionais / total) * 100).toFixed(1) : 0,
    };
  }

  async rankingCusto(top = 10) {
    const [caminhoes, osMap, fuelMap] = await Promise.all([
      prisma.caminhao.findMany({
        select: { id: true, codigo: true, modelo: true, fabricante: true },
      }),
      this.osCostByCaminhao(),
      this.fuelCostByCaminhao(),
    ]);

    return caminhoes
      .map((cam) => {
        const custoOS = Math.round((osMap.get(cam.id) ?? 0) * 100) / 100;
        const custoCombustivel = Math.round((fuelMap.get(cam.id) ?? 0) * 100) / 100;
        return {
          caminhao: cam.codigo,
          modelo: cam.modelo,
          fabricante: cam.fabricante,
          custoOS,
          custoCombustivel,
          total: Math.round((custoOS + custoCombustivel) * 100) / 100,
        };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, top);
  }

  async custoPorKm() {
    const [caminhoes, osMap, fuelMap, kmInicials] = await Promise.all([
      prisma.caminhao.findMany({
        select: { id: true, codigo: true, modelo: true, fabricante: true, kmAtual: true },
      }),
      this.osCostByCaminhao(),
      this.fuelCostByCaminhao(),
      prisma.kmRegistro.groupBy({ by: ['caminhaoId'], _min: { km: true } }),
    ]);

    const kmInicialMap = new Map(
      kmInicials.map((r: { caminhaoId: string; _min: { km: number | null } }) => [r.caminhaoId, r._min.km ?? 0]),
    );

    return caminhoes
      .map((cam) => {
        const custoOS = Math.round((osMap.get(cam.id) ?? 0) * 100) / 100;
        const custoComb = Math.round((fuelMap.get(cam.id) ?? 0) * 100) / 100;
        const total = Math.round((custoOS + custoComb) * 100) / 100;
        const kmRodados = Math.max(0, cam.kmAtual - (kmInicialMap.get(cam.id) ?? 0));
        const custoPorKm = kmRodados > 0 ? Math.round((total / kmRodados) * 100) / 100 : 0;
        return {
          id: cam.id,
          caminhao: cam.codigo,
          modelo: cam.modelo,
          fabricante: cam.fabricante,
          kmAtual: cam.kmAtual,
          kmRodados,
          custoOS,
          custoCombustivel: custoComb,
          total,
          custoPorKm,
        };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.custoPorKm - a.custoPorKm);
  }

  async documentosVencendo(dias = 30) {
    const em30Dias = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    return prisma.caminhao.findMany({
      where: {
        OR: [
          { vencimentoCrlv: { lte: em30Dias } },
          { vencimentoSeguro: { lte: em30Dias } },
        ],
        status: { not: 'parado' },
      },
      select: {
        id: true, codigo: true, modelo: true, placa: true, status: true,
        vencimentoCrlv: true, vencimentoSeguro: true, numeroSeguro: true,
      },
      orderBy: { vencimentoCrlv: 'asc' },
      take: 50,
    });
  }

  async caminhoesComManutencaoVencendo() {
    const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return prisma.caminhao.findMany({
      where: {
        proximaManutencao: { lte: em30Dias },
        status: 'operacional',
      },
      include: { motorista: { select: { id: true, nome: true } } },
      orderBy: { proximaManutencao: 'asc' },
      take: 50,
    });
  }

  async historicoKm(caminhaoId: string) {
    return prisma.kmRegistro.findMany({
      where: { caminhaoId },
      orderBy: { data: 'desc' },
      take: 100,
    });
  }

  async caminhoesProximosManutencaoKm(margem = 1000) {
    const rows = await prisma.$queryRaw<Array<{
      id: string; codigo: string; placa: string; modelo: string; status: string;
      km_atual: number; proxima_manutencao_km: number;
      km_restantes: number; motorista_nome: string | null;
    }>>`
      SELECT
        c.id, c.codigo, c.placa, c.modelo, c.status,
        c.km_atual, c.proxima_manutencao_km,
        (c.proxima_manutencao_km - c.km_atual)  AS km_restantes,
        f.nome                                   AS motorista_nome
      FROM caminhoes c
      LEFT JOIN funcionarios f ON f.id = c.motorista_id
      WHERE c.status = 'operacional'
        AND c.proxima_manutencao_km IS NOT NULL
        AND (c.proxima_manutencao_km - c.km_atual) <= ${margem}
      ORDER BY (c.proxima_manutencao_km - c.km_atual) ASC
    `;

    return rows.map((r) => ({
      id:                  r.id,
      codigo:              r.codigo,
      placa:               r.placa,
      modelo:              r.modelo,
      status:              r.status,
      kmAtual:             r.km_atual,
      proximaManutencaoKm: r.proxima_manutencao_km,
      kmRestantes:         r.km_restantes,
      motoristaNome:       r.motorista_nome ?? null,
      urgente:             r.km_restantes <= 0,
    }));
  }

  async timelineManutencao(caminhaoId: string, limit = 50) {
    const [ordensServico, trocasPneu, checklists, kmRegistros] = await Promise.all([
      prisma.ordemServico.findMany({
        where: { caminhaoId, tipo: { in: ['preventiva', 'corretiva'] } },
        select: {
          id: true, codigo: true, tipo: true, status: true, prioridade: true,
          dataAbertura: true, dataConclusao: true, custoTotal: true, descricao: true,
          responsavel: { select: { id: true, nome: true } },
        },
        orderBy: { dataAbertura: 'desc' },
        take: limit,
      }),
      prisma.trocaPneu.findMany({
        where: { pneu: { caminhaoId } },
        select: {
          id: true, kmTroca: true, motivo: true, custo: true, createdAt: true,
          pneu: { select: { posicao: true, marca: true, modelo: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.checklistVistoria.findMany({
        where: { caminhaoId },
        select: {
          id: true, tipo: true, aprovado: true, kmAtual: true, createdAt: true,
          motorista: { select: { id: true, nome: true } },
          itens: { where: { ok: false }, select: { item: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.kmRegistro.findMany({
        where: { caminhaoId },
        select: { id: true, km: true, data: true },
        orderBy: { data: 'desc' },
        take: 20,
      }),
    ]);

    type TimelineEvent = {
      id: string; tipo: string; data: Date; titulo: string;
      subtitulo?: string; status?: string; custo?: number | null;
      meta?: Record<string, unknown>;
    };

    const eventos: TimelineEvent[] = [
      ...ordensServico.map((os) => ({
        id: os.id, tipo: 'os', data: os.dataConclusao ?? os.dataAbertura,
        titulo: `OS ${os.codigo} — ${os.tipo}`,
        subtitulo: os.responsavel?.nome,
        status: os.status, custo: os.custoTotal,
        meta: { prioridade: os.prioridade, descricao: os.descricao },
      })),
      ...trocasPneu.map((t) => ({
        id: t.id, tipo: 'troca_pneu', data: t.createdAt,
        titulo: `Troca de pneu — ${t.pneu.posicao}`,
        subtitulo: `${t.pneu.marca} ${t.pneu.modelo} · ${t.kmTroca.toLocaleString('pt-BR')} km`,
        custo: t.custo, meta: { motivo: t.motivo, kmTroca: t.kmTroca },
      })),
      ...checklists.map((cl) => ({
        id: cl.id, tipo: 'checklist', data: cl.createdAt,
        titulo: `Checklist ${cl.tipo === 'pre_viagem' ? 'pré-viagem' : 'pós-viagem'} — ${cl.aprovado ? 'Aprovado' : 'Reprovado'}`,
        subtitulo: cl.motorista?.nome,
        status: cl.aprovado ? 'aprovado' : 'reprovado',
        meta: { kmAtual: cl.kmAtual, itensFalhos: cl.itens.map((i) => i.item) },
      })),
      ...kmRegistros.map((km) => ({
        id: km.id, tipo: 'km', data: km.data,
        titulo: `KM registrado: ${km.km.toLocaleString('pt-BR')} km`,
        meta: { km: km.km },
      })),
    ];

    return eventos
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, limit);
  }

  private async osCostByCaminhao(): Promise<Map<string, number>> {
    const rows = await prisma.ordemServico.groupBy({
      by: ['caminhaoId'],
      where: { status: 'concluida' },
      _sum: { custoTotal: true },
    });
    return new Map(rows.map((r) => [r.caminhaoId, r._sum.custoTotal ?? 0]));
  }

  private async fuelCostByCaminhao(): Promise<Map<string, number>> {
    const rows = await prisma.$queryRaw<{ caminhao_id: string; total: number }[]>`
      SELECT caminhao_id, SUM(litros * preco_litro) AS total
      FROM abastecimentos
      GROUP BY caminhao_id
    `;
    return new Map(rows.map((r) => [r.caminhao_id, Number(r.total)]));
  }
}
