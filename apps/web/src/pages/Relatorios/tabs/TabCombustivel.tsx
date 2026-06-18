import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Download, FileText } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  useAbastecimentosKPIs, useHistoricoAbastecimento, useConsumoPorCaminhao, useRankingEficiencia,
} from '../../../hooks/useApi';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabCombustivel() {
  const navigate = useNavigate();
  const [mesesHistorico, setMesesHistorico] = useState(6);

  const { data: combKPIs } = useAbastecimentosKPIs();
  const { data: historicoAbast = [], isLoading: loadingHistorico } = useHistoricoAbastecimento(mesesHistorico);
  const { data: consumoCaminhao = [] } = useConsumoPorCaminhao();
  const { data: rankingEficiencia = [] } = useRankingEficiencia();

  const topConsumoCaminhao = useMemo(
    () =>
      consumoCaminhao
        .map((c) => ({ nome: c.caminhao?.codigo ?? c.caminhaoId, litros: +(c._sum.litros ?? 0).toFixed(1), abastecimentos: c._count }))
        .sort((a, b) => b.litros - a.litros)
        .slice(0, 10),
    [consumoCaminhao],
  );

  function exportarPDF() {
    const kpis = [
      { label: 'Litros (mês)', value: combKPIs?.litrosMes ? `${combKPIs.litrosMes.toFixed(0)} L` : '—' },
      { label: 'Custo (mês)', value: combKPIs?.custoMes ? `R$ ${combKPIs.custoMes.toFixed(0)}` : '—' },
      { label: 'Preço médio/L', value: combKPIs?.precoMedioLitro ? `R$ ${combKPIs.precoMedioLitro.toFixed(2)}` : '—' },
      { label: 'Abastecimentos', value: combKPIs?.abastecimentosMes ?? '—' },
    ];
    const secoes = [
      {
        titulo: 'Histórico Mensal',
        headers: ['Mês', 'Abast.', 'Litros', 'Custo (R$)', 'R$/L médio'],
        rows: historicoAbast.map((r) => [r.mes, r.abastecimentos, r.litros.toFixed(1), r.custo.toFixed(2), r.litros > 0 ? (r.custo / r.litros).toFixed(2) : '—']),
      },
      {
        titulo: 'Consumo por Caminhão',
        headers: ['Caminhão', 'Litros', 'Abastecimentos'],
        rows: topConsumoCaminhao.map((c) => [c.nome, `${c.litros} L`, c.abastecimentos]),
      },
    ];
    printDocument(buildRelatorioTabHtml('Combustível', kpis, secoes), 'Relatório — Combustível');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          onClick={exportarPDF}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <FileText size={15} /> Exportar PDF
        </button>
      </div>

      {/* KPIs rápidos do mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Litros (mês)', value: combKPIs?.litrosMes ? `${combKPIs.litrosMes.toFixed(0)} L` : '—' },
          { label: 'Custo (mês)', value: combKPIs?.custoMes ? `R$ ${combKPIs.custoMes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—' },
          { label: 'Preço médio/L', value: combKPIs?.precoMedioLitro ? `R$ ${combKPIs.precoMedioLitro.toFixed(2)}` : '—' },
          { label: 'Abastecimentos', value: combKPIs?.abastecimentosMes ?? '—' },
        ].map(({ label, value }) => (
          <button key={label} onClick={() => navigate('/abastecimento')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </button>
        ))}
      </div>

      {/* Gráfico histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Consumo Mensal de Combustível</h3>
            <p className="text-xs text-gray-400 mt-0.5">Litros consumidos e custo total</p>
          </div>
          <select
            value={mesesHistorico}
            onChange={(e) => setMesesHistorico(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 print:hidden"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>

        {loadingHistorico ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historicoAbast.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Fuel size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhum dado de abastecimento no período</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={historicoAbast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}L`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    name === 'Litros (L)' ? `${value.toLocaleString('pt-BR')} L` : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="litros" stroke="#118AB2" strokeWidth={2} dot={{ r: 4 }} name="Litros (L)" />
                <Line yAxisId="right" type="monotone" dataKey="custo" stroke="#F77F00" strokeWidth={2} dot={{ r: 4 }} name="Custo (R$)" />
              </LineChart>
            </ResponsiveContainer>
            {/* Tabela resumo */}
            <div className="mt-4 overflow-x-auto">
              <div className="flex justify-end mb-2 print:hidden">
                <button
                  onClick={() => exportCsv(
                    `combustivel-${mesesHistorico}meses.csv`,
                    ['Mês', 'Abastecimentos', 'Litros', 'Custo (R$)', 'R$/L médio', 'Custo/Abast. médio (R$)'],
                    historicoAbast.map((r) => [
                      r.mes, r.abastecimentos, r.litros.toFixed(1), r.custo.toFixed(2),
                      r.litros > 0 ? (r.custo / r.litros).toFixed(2) : '',
                      r.abastecimentos > 0 ? (r.custo / r.abastecimentos).toFixed(2) : '',
                    ]),
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-400 font-medium">Mês</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Abast.</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Litros</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Custo</th>
                    <th className="text-right py-2 text-gray-400 font-medium">R$/L médio</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Custo/Abast.</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoAbast.map((row) => (
                    <tr key={row.mes} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-2 font-medium text-gray-700">{row.mes}</td>
                      <td className="py-2 text-right text-gray-600">{row.abastecimentos}</td>
                      <td className="py-2 text-right text-gray-600">{row.litros.toLocaleString('pt-BR')} L</td>
                      <td className="py-2 text-right text-gray-700 font-medium">R$ {row.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right text-gray-600">
                        {row.litros > 0 ? `R$ ${(row.custo / row.litros).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {row.abastecimentos > 0 ? `R$ ${(row.custo / row.abastecimentos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Ranking de Eficiência km/L */}
      {rankingEficiencia.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Ranking de Eficiência</h3>
              <p className="text-xs text-gray-400 mt-0.5">Média km/L por caminhão (histórico completo)</p>
            </div>
            <button
              onClick={() => exportCsv(
                'ranking-eficiencia.csv',
                ['Caminhão', 'Placa', 'Modelo', 'Média km/L', 'Total Litros', 'Abastecimentos'],
                rankingEficiencia.map((r) => [r.codigo, r.placa, r.modelo, r.mediaKmL?.toFixed(2) ?? '', r.totalLitros.toFixed(1), r.totalAbastecimentos]),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Caminhão', 'Placa', 'Modelo', 'km/L', 'Total Litros', 'Abast.'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-3 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankingEficiencia.map((r, idx) => {
                  const top = rankingEficiencia[0].mediaKmL ?? 1;
                  const pct = Math.round(((r.mediaKmL ?? 0) / top) * 100);
                  return (
                    <tr key={r.caminhaoId} className="hover:bg-gray-50/50 transition">
                      <td className="px-3 py-2.5 text-xs text-gray-400 w-8">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => navigate(`/frota/${r.caminhaoId}`)} className="font-mono text-xs font-bold text-blue-600 hover:underline">
                          {r.codigo}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 font-mono">{r.placa}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{r.modelo}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-semibold ${idx === 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                            {r.mediaKmL?.toFixed(2)} km/L
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{r.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{r.totalAbastecimentos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consumo por caminhão */}
      {consumoCaminhao.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Consumo por Caminhão</h3>
              <p className="text-xs text-gray-400 mt-0.5">Litros abastecidos — mês corrente</p>
            </div>
            <button
              onClick={() => exportCsv(
                `consumo-por-caminhao-${new Date().toISOString().slice(0, 7)}.csv`,
                ['Caminhão', 'Modelo', 'Litros', 'Abastecimentos'],
                consumoCaminhao.map((c) => [
                  c.caminhao?.codigo ?? c.caminhaoId,
                  c.caminhao?.modelo ?? '',
                  (c._sum.litros ?? 0).toFixed(1),
                  String(c._count),
                ]),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={topConsumoCaminhao}
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                formatter={(v: number, name: string) => [name === 'litros' ? `${v} L` : v, name === 'litros' ? 'Litros' : 'Abastecimentos']}
              />
              <Bar dataKey="litros" fill="#118AB2" radius={[0, 4, 4, 0]} name="litros" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
