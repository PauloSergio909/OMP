import { prisma } from '../../config/database';

export class PneusAnalyticsService {
  async getKPIs(caminhaoId: string, kmAtual: number) {
    const pneus = await prisma.pneu.findMany({
      where: { caminhaoId, status: 'ativo' },
      select: { id: true, posicao: true, marca: true, modelo: true, kmInstalacao: true, kmVidaUtil: true },
    });

    return pneus.map((p) => {
      const kmRodados = Math.max(0, kmAtual - p.kmInstalacao);
      const pctVida = Math.min(100, Math.round((kmRodados / p.kmVidaUtil) * 100));
      return { ...p, kmRodados, pctVida, alertar: pctVida >= 80 };
    });
  }

  async listarAlertas() {
    const rows = await prisma.$queryRaw<Array<{
      caminhao_id: string; codigo: string; placa: string; modelo: string;
      km_atual: number; pneus_alerta: bigint; max_pct: number;
    }>>`
      SELECT
        c.id                                            AS caminhao_id,
        c.codigo, c.placa, c.modelo, c.km_atual,
        COUNT(p.id) FILTER (
          WHERE LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
              / p.km_vida_util * 100)) >= 80
        )                                               AS pneus_alerta,
        MAX(LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
            / p.km_vida_util * 100)))                   AS max_pct
      FROM caminhoes c
      JOIN pneus p ON p.caminhao_id = c.id AND p.status = 'ativo'
      GROUP BY c.id, c.codigo, c.placa, c.modelo, c.km_atual
      HAVING COUNT(p.id) FILTER (
        WHERE LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
            / p.km_vida_util * 100)) >= 80
      ) > 0
      ORDER BY max_pct DESC
    `;

    return rows.map((r) => ({
      caminhaoId:  r.caminhao_id,
      codigo:      r.codigo,
      placa:       r.placa,
      modelo:      r.modelo,
      kmAtual:     r.km_atual,
      pneusAlerta: Number(r.pneus_alerta),
      maxPct:      Number(r.max_pct),
    }));
  }

  async getKPIsGlobal() {
    const rows = await prisma.$queryRaw<Array<{
      total: bigint; ativos: bigint; inativos: bigint;
      alertas80: bigint; alertas95: bigint; vida_media_pct: number | null;
    }>>`
      SELECT
        COUNT(*)                                                           AS total,
        COUNT(*) FILTER (WHERE p.status = 'ativo')                        AS ativos,
        COUNT(*) FILTER (WHERE p.status != 'ativo')                       AS inativos,
        COUNT(*) FILTER (
          WHERE p.status = 'ativo'
            AND LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
                / p.km_vida_util * 100)) >= 80
        )                                                                  AS alertas80,
        COUNT(*) FILTER (
          WHERE p.status = 'ativo'
            AND LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
                / p.km_vida_util * 100)) >= 95
        )                                                                  AS alertas95,
        AVG(CASE WHEN p.status = 'ativo' THEN
          LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
              / p.km_vida_util * 100))
        END)                                                               AS vida_media_pct
      FROM pneus p
      LEFT JOIN caminhoes c ON c.id = p.caminhao_id
    `;

    const r = rows[0];
    return {
      total:        Number(r.total),
      ativos:       Number(r.ativos),
      inativos:     Number(r.inativos),
      alertas80:    Number(r.alertas80),
      alertas95:    Number(r.alertas95),
      vidaMediaPct: r.vida_media_pct !== null ? Math.round(Number(r.vida_media_pct)) : 0,
    };
  }
}
