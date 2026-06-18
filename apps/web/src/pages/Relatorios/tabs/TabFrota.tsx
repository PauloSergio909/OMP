import { useNavigate } from 'react-router-dom';
import { Truck, TrendingUp, Download, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useFrotaKPIs, useFrotaRankingCusto, useFrotaCustoPorKm } from '../../../hooks/useApi';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabFrota() {
  const navigate = useNavigate();
  const { data: frotaKPIs } = useFrotaKPIs();
  const { data: rankingCusto = [] } = useFrotaRankingCusto();
  const { data: custoPorKm = [] } = useFrotaCustoPorKm();

  function exportarPDF() {
    const kpis = [
      { label: 'Total Frota', value: frotaKPIs?.total ?? '—', sub: `${frotaKPIs?.taxaDisponibilidade ?? '—'}% disponível` },
      { label: 'Operacionais', value: frotaKPIs?.operacionais ?? '—' },
      { label: 'Em Manutenção', value: frotaKPIs?.emManutencao ?? '—' },
      { label: 'Manutenção Vencendo', value: frotaKPIs?.manutencaoVencendo ?? '—', sub: 'próximos 30 dias' },
    ];
    const secoes = rankingCusto.length > 0 ? [
      {
        titulo: 'Ranking de Custo (Manutenção + Combustível)',
        headers: ['Caminhão', 'Modelo', 'Custo OS (R$)', 'Custo Comb. (R$)', 'Total (R$)'],
        rows: rankingCusto.map((r) => [r.codigo ?? '', r.modelo ?? '', r.custoOS?.toFixed(2) ?? '0', r.custoCombustivel?.toFixed(2) ?? '0', r.total?.toFixed(2) ?? '0']),
      },
      {
        titulo: 'Custo por KM Rodado',
        headers: ['Caminhão', 'Modelo', 'KM Rodados', 'R$/km'],
        rows: custoPorKm.map((r) => [r.codigo ?? '', r.modelo ?? '', r.kmRodados?.toLocaleString('pt-BR') ?? '', r.custoPorKm?.toFixed(3) ?? '—']),
      },
    ] : [];
    printDocument(buildRelatorioTabHtml('Frota', kpis, secoes), 'Relatório — Frota');
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Frota', value: frotaKPIs?.total, cls: 'bg-blue-50 border-blue-100 hover:border-blue-300', labelCls: 'text-blue-600', valueCls: 'text-blue-700', path: '/frota' },
          { label: 'Operacionais', value: frotaKPIs?.operacionais, cls: 'bg-green-50 border-green-100 hover:border-green-300', labelCls: 'text-green-600', valueCls: 'text-green-700', path: '/frota?status=operacional' },
          { label: 'Em Manutenção', value: frotaKPIs?.emManutencao, cls: 'bg-orange-50 border-orange-100 hover:border-orange-300', labelCls: 'text-orange-600', valueCls: 'text-orange-700', path: '/frota?status=manutencao' },
          { label: 'Manutenção Vencendo', value: frotaKPIs?.manutencaoVencendo, cls: 'bg-red-50 border-red-100 hover:border-red-300', labelCls: 'text-red-600', valueCls: 'text-red-700', path: '/frota?manutencao=1' },
        ].map(({ label, value, cls, labelCls, valueCls, path }) => (
          <button key={label} onClick={() => navigate(path)} className={`text-left p-4 rounded-xl border transition ${cls}`}>
            <p className={`text-xs font-semibold uppercase mb-1 ${labelCls}`}>{label}</p>
            <p className={`text-3xl font-bold ${valueCls}`}>{value ?? '—'}</p>
          </button>
        ))}
      </div>

      {/* Ranking de custo */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Ranking de Custo Total por Veículo</h3>
          </div>
          {rankingCusto.length > 0 && (
            <button
              onClick={() => exportCsv(
                'ranking-custo-frota.csv',
                ['Caminhão', 'Modelo', 'Custo OS (R$)', 'Custo Combustível (R$)', 'Total (R$)'],
                rankingCusto.map((r) => [r.codigo ?? '', r.modelo ?? '', r.custoOS?.toFixed(2) ?? '0', r.custoCombustivel?.toFixed(2) ?? '0', r.total?.toFixed(2) ?? '0']),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          )}
        </div>
        {rankingCusto.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Nenhum dado de custo disponível</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Caminhão', 'Modelo', 'Custo OS', 'Custo Combustível', 'Total'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-gray-400 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankingCusto.slice(0, 15).map((r, idx) => (
                  <tr key={r.id ?? idx} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/frota/${r.id}`)}>
                    <td className="px-5 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-blue-600">{r.codigo}</td>
                    <td className="px-5 py-3 text-gray-700">{r.modelo}</td>
                    <td className="px-5 py-3 text-orange-600 font-medium">R$ {(r.custoOS ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                    <td className="px-5 py-3 text-green-600 font-medium">R$ {(r.custoCombustivel ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                    <td className="px-5 py-3 font-bold text-gray-900">R$ {(r.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custo por KM */}
      {custoPorKm.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-900">Custo por KM Rodado</h3>
            </div>
            <button
              onClick={() => exportCsv(
                'custo-por-km.csv',
                ['Caminhão', 'Modelo', 'KM Rodados', 'R$/km'],
                custoPorKm.map((r) => [r.codigo ?? '', r.modelo ?? '', r.kmRodados ?? 0, r.custoPorKm?.toFixed(3) ?? '—']),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Caminhão', 'Modelo', 'KM Rodados', 'Custo Total', 'R$/km'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-gray-400 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {custoPorKm.filter((r) => r.kmRodados > 0).slice(0, 15).map((r, idx) => {
                  const custoPorKmVal = r.custoPorKm ?? 0;
                  const cor = custoPorKmVal > 2 ? 'text-red-600' : custoPorKmVal > 1 ? 'text-amber-600' : 'text-green-600';
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/frota/${r.id}`)}>
                      <td className="px-5 py-3 font-mono font-semibold text-blue-600">{r.codigo}</td>
                      <td className="px-5 py-3 text-gray-700">{r.modelo}</td>
                      <td className="px-5 py-3 text-gray-600">{(r.kmRodados ?? 0).toLocaleString('pt-BR')} km</td>
                      <td className="px-5 py-3 text-gray-700 font-medium">R$ {(r.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                      <td className={`px-5 py-3 font-bold ${cor}`}>R$ {custoPorKmVal.toFixed(3)}/km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
