import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class AbastecimentoAnalyticsService {
  async getKPIs(caminhaoId?: string) {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const where = caminhaoId ? { caminhaoId } : {};

    const [totalMes, registros] = await Promise.all([
      prisma.abastecimento.count({
        where: { ...where, data: { gte: inicioMes } },
      }),
      prisma.abastecimento.findMany({
        where: { ...where, data: { gte: inicioMes } },
        select: { litros: true, precoLitro: true },
      }),
    ]);

    const litrosMes = registros.reduce((s: number, r: { litros: number; precoLitro: number }) => s + r.litros, 0);
    const custoMes = registros.reduce((s: number, r: { litros: number; precoLitro: number }) => s + r.litros * r.precoLitro, 0);
    const precoMedioLitro = litrosMes > 0 ? custoMes / litrosMes : 0;

    return {
      abastecimentosMes: totalMes,
      litrosMes,
      custoMes,
      precoMedioLitro,
    };
  }

  async historicoMensal(meses = 6, caminhaoId?: string) {
    const inicio = new Date(new Date().getFullYear(), new Date().getMonth() - (meses - 1), 1);
    const fim = new Date();

    type Row = { mes_inicio: Date; litros: number; custo: number; abastecimentos: number };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        DATE_TRUNC('month', data)           AS mes_inicio,
        SUM(litros)::float                   AS litros,
        SUM(litros * preco_litro)::float     AS custo,
        COUNT(*)::int                        AS abastecimentos
      FROM abastecimentos
      WHERE data >= ${inicio} AND data <= ${fim}
      ${caminhaoId ? Prisma.sql`AND caminhao_id = ${caminhaoId}` : Prisma.empty}
      GROUP BY DATE_TRUNC('month', data)
      ORDER BY DATE_TRUNC('month', data)
    `;

    const rowMap = new Map<string, Row>(
      rows.map((r) => [new Date(r.mes_inicio).toISOString().substring(0, 7), r]),
    );

    return Array.from({ length: meses }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - (meses - 1 - i), 1);
      const key = d.toISOString().substring(0, 7);
      const row = rowMap.get(key);
      return {
        mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        litros: Math.round((row?.litros ?? 0) * 10) / 10,
        custo: Math.round((row?.custo ?? 0) * 100) / 100,
        abastecimentos: row?.abastecimentos ?? 0,
      };
    });
  }

  async consumoPorCaminhao() {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const dados = await prisma.abastecimento.groupBy({
      by: ['caminhaoId'],
      where: { data: { gte: inicioMes } },
      _sum: { litros: true },
      _count: true,
    });

    const caminhoes = await prisma.caminhao.findMany({
      where: { id: { in: dados.map((d: { caminhaoId: string }) => d.caminhaoId) } },
      select: { id: true, codigo: true, modelo: true },
    });

    const caminhaoMap = new Map(caminhoes.map((c: { id: string; codigo: string; modelo: string }) => [c.id, c]));

    return dados.map((d: { caminhaoId: string }) => ({
      ...d,
      caminhao: caminhaoMap.get(d.caminhaoId),
    }));
  }

  async getEficienciaCaminhao(caminhaoId: string) {
    const rows = await prisma.$queryRaw<[{ media_kml: number | null; total_abastecimentos: bigint }]>`
      WITH pares AS (
        SELECT litros, km_atual,
          LAG(km_atual) OVER (ORDER BY data ASC) AS km_anterior
        FROM abastecimentos
        WHERE caminhao_id = ${caminhaoId}
      )
      SELECT
        ROUND(AVG(
          CASE WHEN km_anterior IS NOT NULL AND km_atual > km_anterior AND litros > 0
            THEN (km_atual - km_anterior)::numeric / litros
            ELSE NULL
          END
        )::numeric, 2) AS media_kml,
        COUNT(*) AS total_abastecimentos
      FROM pares
    `;
    const r = rows[0];
    return {
      mediaKmL:           r.media_kml !== null ? Number(r.media_kml) : null,
      totalAbastecimentos: Number(r.total_abastecimentos),
    };
  }

  async rankingEficiencia() {
    // Usa LAG para calcular km percorridos entre abastecimentos consecutivos por caminhão.
    // kmPercorridos não é armazenado no banco — é calculado aqui via window function.
    const rows = await prisma.$queryRaw<Array<{
      caminhao_id: string; codigo: string; placa: string; modelo: string;
      media_kml: number | null; total_litros: number; total_abastecimentos: bigint;
    }>>`
      WITH pares AS (
        SELECT
          a.caminhao_id,
          a.litros,
          a.km_atual,
          LAG(a.km_atual) OVER (PARTITION BY a.caminhao_id ORDER BY a.data ASC) AS km_anterior
        FROM abastecimentos a
      )
      SELECT
        c.id                                          AS caminhao_id,
        c.codigo,
        c.placa,
        c.modelo,
        ROUND(AVG(
          CASE WHEN p.km_anterior IS NOT NULL
                AND p.km_atual > p.km_anterior
                AND p.litros > 0
            THEN (p.km_atual - p.km_anterior)::numeric / p.litros
            ELSE NULL
          END
        )::numeric, 2)                                AS media_kml,
        ROUND(SUM(p.litros)::numeric, 1)              AS total_litros,
        COUNT(*)                                      AS total_abastecimentos
      FROM pares p
      JOIN caminhoes c ON c.id = p.caminhao_id
      GROUP BY c.id, c.codigo, c.placa, c.modelo
      HAVING AVG(
        CASE WHEN p.km_anterior IS NOT NULL
              AND p.km_atual > p.km_anterior
              AND p.litros > 0
          THEN (p.km_atual - p.km_anterior)::numeric / p.litros
          ELSE NULL
        END
      ) IS NOT NULL
      ORDER BY media_kml DESC
    `;

    return rows.map((r) => ({
      caminhaoId:         r.caminhao_id,
      codigo:             r.codigo,
      placa:              r.placa,
      modelo:             r.modelo,
      mediaKmL:           r.media_kml !== null ? Number(r.media_kml) : null,
      totalLitros:        Number(r.total_litros),
      totalAbastecimentos: Number(r.total_abastecimentos),
    }));
  }
}
