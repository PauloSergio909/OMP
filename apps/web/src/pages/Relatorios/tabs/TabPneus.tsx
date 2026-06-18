import { useNavigate } from 'react-router-dom';
import { CircleDot, Gauge, Download, FileText } from 'lucide-react';
import { usePneusKPIs, usePneusAlertas } from '../../../hooks/useApi';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabPneus() {
  const navigate = useNavigate();
  const { data: pneusKPIs } = usePneusKPIs();
  const { data: pneusAlertas = [] } = usePneusAlertas();

  function exportarPDF() {
    const kpis = [
      { label: 'Total de Pneus', value: pneusKPIs?.total ?? '—' },
      { label: 'Pneus Ativos', value: pneusKPIs?.ativos ?? '—', sub: `${pneusKPIs?.inativos ?? 0} trocados/descartados` },
      { label: 'Desgaste ≥ 80%', value: pneusKPIs?.alertas80 ?? '—', sub: `${pneusKPIs?.alertas95 ?? 0} crítico(s) ≥ 95%` },
      { label: 'Vida Útil Média', value: pneusKPIs?.vidaMediaPct != null ? `${pneusKPIs.vidaMediaPct}%` : '—' },
    ];
    const secoes = pneusAlertas.length > 0 ? [{
      titulo: 'Caminhões com Pneus em Alerta (≥ 80% de desgaste)',
      headers: ['Caminhão', 'Placa', 'Modelo', 'KM Atual', 'Pneus em Alerta', 'Desgaste Máx.'],
      rows: pneusAlertas.map((p) => [
        p.codigo, p.placa, p.modelo,
        `${p.kmAtual.toLocaleString('pt-BR')} km`,
        p.pneusAlerta,
        `${p.maxPct}%`,
      ]),
    }] : [];
    printDocument(buildRelatorioTabHtml('Pneus', kpis, secoes), 'Relatório — Pneus');
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

      {/* KPIs globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Pneus', value: pneusKPIs?.total ?? '—', sub: `${pneusKPIs?.inativos ?? 0} trocados/descartados` },
          { label: 'Pneus Ativos', value: pneusKPIs?.ativos ?? '—', sub: 'em serviço' },
          { label: 'Desgaste ≥ 80%', value: pneusKPIs?.alertas80 ?? '—', sub: 'atenção necessária', alert: (pneusKPIs?.alertas80 ?? 0) > 0 },
          { label: 'Desgaste ≥ 95%', value: pneusKPIs?.alertas95 ?? '—', sub: 'substituição urgente', critical: (pneusKPIs?.alertas95 ?? 0) > 0 },
        ].map(({ label, value, sub, alert, critical }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 ${critical ? 'border-red-200 bg-red-50/30' : alert ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
            <p className={`text-2xl font-bold ${critical ? 'text-red-600' : alert ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Vida média */}
      {pneusKPIs && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Gauge size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Vida Útil Média da Frota</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${pneusKPIs.vidaMediaPct >= 80 ? 'bg-red-500' : pneusKPIs.vidaMediaPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${pneusKPIs.vidaMediaPct}%` }}
              />
            </div>
            <span className={`text-lg font-bold min-w-[4rem] text-right ${pneusKPIs.vidaMediaPct >= 80 ? 'text-red-600' : pneusKPIs.vidaMediaPct >= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pneusKPIs.vidaMediaPct}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Média ponderada de todos os pneus ativos</p>
        </div>
      )}

      {/* Caminhões com pneus em alerta */}
      {pneusAlertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Caminhões com Pneus em Alerta (≥ 80% de desgaste)</h3>
            </div>
            <button
              onClick={() => exportCsv(
                'pneus-alertas.csv',
                ['Caminhão', 'Placa', 'Modelo', 'KM Atual', 'Pneus em Alerta', 'Desgaste Máx.'],
                pneusAlertas.map((p) => [p.codigo, p.placa, p.modelo, p.kmAtual, p.pneusAlerta, `${p.maxPct}%`]),
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
                  {['Caminhão', 'Placa', 'Modelo', 'KM Atual', 'Pneus em Alerta', 'Desgaste Máx.'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pneusAlertas.map((p) => (
                  <tr key={p.caminhaoId} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-2.5">
                      <button onClick={() => navigate(`/frota/${p.caminhaoId}`)} className="font-mono text-xs font-bold text-blue-600 hover:underline">
                        {p.codigo}
                      </button>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-500 font-mono">{p.placa}</td>
                    <td className="px-5 py-2.5 text-xs text-gray-700">{p.modelo}</td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">{p.kmAtual.toLocaleString('pt-BR')} km</td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.pneusAlerta >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.pneusAlerta} pneu{p.pneusAlerta !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-bold ${p.maxPct >= 95 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.maxPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pneusAlertas.length === 0 && pneusKPIs && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <CircleDot size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum pneu com desgaste ≥ 80%</p>
          <p className="text-xs mt-1">Todos os {pneusKPIs.ativos} pneus ativos estão dentro da vida útil segura</p>
        </div>
      )}
    </div>
  );
}
