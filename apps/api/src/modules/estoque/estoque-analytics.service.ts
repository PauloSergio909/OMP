import { prisma } from '../../config/database';

export class EstoqueAnalyticsService {
  async materiaisAbaixoDoMinimo() {
    type Row = { id: string; codigo: string; nome: string; unidadeMedida: string; estoqueMinimo: number; quantidade: number };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT m.id, m.codigo, m.nome, m.unidade_medida AS "unidadeMedida",
             m.estoque_minimo AS "estoqueMinimo", COALESCE(e.quantidade, 0) AS quantidade
      FROM materiais m
      LEFT JOIN estoques e ON e.material_id = m.id
      WHERE m.ativo = true AND COALESCE(e.quantidade, 0) < m.estoque_minimo
      ORDER BY (m.estoque_minimo - COALESCE(e.quantidade, 0)) DESC
      LIMIT 100
    `;

    return rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      unidadeMedida: r.unidadeMedida,
      estoqueMinimo: Number(r.estoqueMinimo),
      estoques: [{ quantidade: Number(r.quantidade) }],
    }));
  }

  async getKPIs() {
    const [totalMateriais, materiaisCriticos, valorRow] = await Promise.all([
      prisma.material.count({ where: { ativo: true } }),
      this.materiaisAbaixoDoMinimo(),
      prisma.$queryRaw<[{ valor: number }]>`
        SELECT COALESCE(SUM(e.quantidade * m.preco_unitario), 0)::float AS valor
        FROM estoques e
        JOIN materiais m ON m.id = e.material_id
        WHERE m.ativo = true
      `,
    ]);

    return {
      totalMateriais,
      itensAbaixoMinimo: materiaisCriticos.length,
      valorEstoque: Math.round(Number(valorRow[0].valor) * 100) / 100,
      materiaisCriticos,
    };
  }
}
