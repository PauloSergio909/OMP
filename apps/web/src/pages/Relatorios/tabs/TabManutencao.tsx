import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, Truck, TrendingUp, Download, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  useOrdensServicoKPIs, useCustoPorCaminhao, useManutencaoVencendo,
  useFrotaRankingCusto, useFrotaCustoPorKm,
} from '../../../hooks/useApi';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabManutencao() {
  const navigate = useNavigate();
  const { data: osKPIs } = useOrdensServicoKPIs();
  const { data: custoOS = [] } = useCustoPorCaminhao();
  const { data: manutencoes = [] } = useManutencaoVencendo();
  const { data: rankingCusto = [] } = useFrotaRankingCusto();

  const { data: custoPorKm = [] } = useFrotaCustoPorKm();
  const taxaPreventiva = osKPIs?.taxaPreventiva ?? 0;

  function exportarPDF() {
    const kpis = [
      { label: 'OS Abertas', value: osKPIs?.abertas ?? '—' },
      { label: 'Concluídas (mês)', value: osKPIs?.concluidasMes ?? '—' },
      { label: '% Preventiva', value: osKPIs ? `${osKPIs.taxaPreventiva}%` : '—' },
      { label: 'Custo OS (mês)', value: osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—' },
    ];
    const secoes = [
      {
        titulo: 'Manutenção Vencendo / Vencida',
        headers: ['Caminhão', 'Modelo', 'Placa', 'Próx. Manutenção', 'Situação'],
        rows: manutencoes.map((c) => {
          const d = Math.ceil((new Date(c.proximaManutencao).getTime() - Date.now()) / 86400000);
          return [c.codigo, c.modelo, c.placa, new Date(c.proximaManutencao).toLocaleDateString('pt-BR'), d < 0 ? 'VENCIDA' : `${d}d`];
        }),
      },
      {
        titulo: 'Custo por Caminhão (mês)',
        headers: ['Caminhão', 'Modelo', 'Preventiva (R$)', 'Corretiva (R$)', 'Total (R$)'],
        rows: custoOS.map((r) => [r.caminhao, r.modelo, r.preventiva.toFixed(2), r.corretiva.toFixed(2), (r.preventiva + r.corretiva).toFixed(2)]),
      },
    ];
    printDocument(buildRelatorioTabHtml('Manutenção', kpis, secoes), 'Relatório — Manutenção');
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

      {/* KPIs de OS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate((osKPIs?.atrasadas ?? 0) > 0 ? '/ordens-servico?view=lista&atrasada=1' : '/ordens-servico?view=lista')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition" title={(osKPIs?.atrasadas ?? 0) > 0 ? 'Ver OS atrasadas' : 'Ver OS abertas'}>
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">OS Abertas</p>
          <p className="text-2xl font-bold text-gray-900">{osKPIs?.abertas ?? '—'}</p>
          {(osKPIs?.atrasadas ?? 0) > 0 && (
            <p className="text-xs text-red-500 font-medium mt-1">{osKPIs?.atrasadas} atrasada{osKPIs?.atrasadas !== 1 ? 's' : ''}</p>
          )}
        </button>
        <button onClick={() => navigate('/ordens-servico?view=lista&status=concluida')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-green-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Concluídas (mês)</p>
          <p className="text-2xl font-bold text-gray-900">{osKPIs?.concluidasMes ?? '—'}</p>
        </button>
        <button onClick={() => navigate('/ordens-servico?view=lista&tipo=preventiva')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">% Preventiva</p>
          <p className={`text-2xl font-bold ${taxaPreventiva >= 70 ? 'text-green-700' : 'text-red-600'}`}>
            {osKPIs ? `${osKPIs.taxaPreventiva}%` : '—'}
          </p>
        </button>
        <button onClick={() => navigate('/relatorios?tab=Ordens+de+Serviço')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-purple-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Custo OS (mês)</p>
          <p className="text-2xl font-bold text-gray-900">
            {osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—'}
          </p>
        </button>
      </div>

      {/* Manutenção vencendo / vencida */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Manutenção Vencendo / Vencida</h3>
            {manutencoes.length > 0 && (
              <button onClick={() => navigate('/frota?manutencao=1')} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium hover:bg-orange-100 transition" title="Ver todos com manutenção vencendo">
                {manutencoes.length}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {manutencoes.length > 0 && (
              <button
                onClick={() => exportCsv(
                  'manutencao-vencendo.csv',
                  ['Caminhão', 'Modelo', 'Placa', 'Próx. Manutenção', 'Situação'],
                  manutencoes.map((c) => {
                    const dias = Math.ceil((new Date(c.proximaManutencao).getTime() - Date.now()) / 86400000);
                    return [c.codigo, c.modelo, c.placa, new Date(c.proximaManutencao).toLocaleDateString('pt-BR'), dias < 0 ? 'VENCIDA' : 'VENCENDO'];
                  }),
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
              >
                <Download size={12} /> CSV
              </button>
            )}
            <button onClick={() => navigate('/frota?manutencao=1')} className="text-xs text-blue-600 hover:underline print:hidden">
              Ver todos →
            </button>
          </div>
        </div>
        {manutencoes.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-gray-400">
            <Wrench size={28} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhuma manutenção nos próximos 30 dias</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {manutencoes.map((c) => {
              const dias = Math.ceil((new Date(c.proximaManutencao).getTime() - Date.now()) / 86400000);
              const vencida = dias < 0;
              return (
                <button
                  key={c.id}
                  className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition"
                  onClick={() => navigate(`/frota/${c.id}`)}
                  title="Ver detalhes do veículo"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${vencida ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <Wrench size={14} className={vencida ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.codigo}</p>
                    <p className="text-xs text-gray-400">{c.modelo} • {c.placa}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vencida ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {vencida ? `${Math.abs(dias)}d vencida` : `${dias}d`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custo de Manutenção por Caminhão */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Custo de Manutenção por Caminhão</h3>
        <p className="text-xs text-gray-400 mb-4">Preventiva vs Corretiva — mês corrente (OS concluídas)</p>
        {custoOS.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Wrench size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhuma OS concluída no mês corrente</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={custoOS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="caminhao" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="preventiva" fill="#06D6A0" radius={[6, 6, 0, 0]} name="Preventiva" />
                <Bar dataKey="corretiva" fill="#EF476F" radius={[6, 6, 0, 0]} name="Corretiva" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-x-auto">
              <div className="flex justify-end mb-2 print:hidden">
                <button
                  onClick={() => exportCsv(
                    'manutencao-por-caminhao.csv',
                    ['Caminhão', 'Modelo', 'Preventiva (R$)', 'Corretiva (R$)', 'Total (R$)'],
                    custoOS.map((r) => [r.caminhao, r.modelo, r.preventiva.toFixed(2), r.corretiva.toFixed(2), (r.preventiva + r.corretiva).toFixed(2)]),
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-400 font-medium">Caminhão</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Preventiva</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Corretiva</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {custoOS.map((row) => (
                    <tr key={row.caminhao} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-2 font-medium text-gray-700">
                        <button
                          onClick={() => navigate(`/frota?q=${encodeURIComponent(row.caminhao)}`)}
                          className="hover:text-blue-600 transition text-left"
                          title="Ver caminhão na frota"
                        >
                          {row.caminhao}
                        </button>
                        {' '}<span className="text-gray-400 font-normal">{row.modelo}</span>
                      </td>
                      <td className="py-2 text-right text-green-700 font-medium">R$ {row.preventiva.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right text-red-600 font-medium">R$ {row.corretiva.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right text-gray-900 font-bold">R$ {(row.preventiva + row.corretiva).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Ranking custo total por caminhão */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Ranking de Custo Total por Caminhão</h3>
            <span className="text-xs text-gray-400">(histórico acumulado — OS + combustível)</span>
          </div>
          {rankingCusto.length > 0 && (
            <button
              onClick={() => exportCsv(
                'ranking-custo-caminhao.csv',
                ['Caminhão', 'Modelo', 'Custo OS (R$)', 'Custo Combustível (R$)', 'Total (R$)'],
                rankingCusto.map((r) => [r.caminhao, r.modelo, r.custoOS.toFixed(2), r.custoCombustivel.toFixed(2), r.total.toFixed(2)]),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          )}
        </div>
        {rankingCusto.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            <Truck size={28} className="mx-auto mb-2 opacity-30" />
            Sem dados de custo acumulado
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rankingCusto.slice(0, 8)} layout="vertical" margin={{ left: 16, right: 24, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="caminhao" tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="custoOS" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} name="Manutenção (OS)" />
                <Bar dataKey="custoCombustivel" stackId="a" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Combustível" />
              </BarChart>
            </ResponsiveContainer>
            <div className="divide-y divide-gray-50">
              {rankingCusto.slice(0, 5).map((r, idx) => {
                const maxTotal = rankingCusto[0]?.total ?? 1;
                const pct = Math.round((r.total / maxTotal) * 100);
                return (
                  <div key={r.caminhao} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => navigate(`/frota?q=${encodeURIComponent(r.caminhao)}`)}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition text-left"
                          title="Ver caminhão na frota"
                        >
                          {r.caminhao}
                        </button>
                        <span className="text-xs text-gray-400">{r.modelo}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      R$ {r.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Custo por km */}
      {custoPorKm.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-900">Custo por km Rodado</h3>
              <span className="text-xs text-gray-400">(OS + combustível) ÷ km rodados</span>
            </div>
            <button
              onClick={() => exportCsv(
                'custo-por-km.csv',
                ['Caminhão', 'Modelo', 'KM Atual', 'KM Rodados', 'Custo OS (R$)', 'Combustível (R$)', 'Total (R$)', 'R$/km'],
                custoPorKm.map((r) => [r.caminhao, r.modelo, r.kmAtual, r.kmRodados, r.custoOS.toFixed(2), r.custoCombustivel.toFixed(2), r.total.toFixed(2), r.custoPorKm.toFixed(2)]),
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
                  {['Caminhão', 'Modelo', 'KM Atual', 'KM Rodados', 'Custo Total', 'R$/km'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {custoPorKm.slice(0, 10).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/frota/${r.id}`)}>
                    <td className="px-5 py-3 font-mono font-bold text-blue-600 text-sm">{r.caminhao}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{r.modelo}</td>
                    <td className="px-5 py-3 text-gray-700">{r.kmAtual.toLocaleString('pt-BR')} km</td>
                    <td className="px-5 py-3 text-gray-600">{r.kmRodados.toLocaleString('pt-BR')} km</td>
                    <td className="px-5 py-3 font-medium text-gray-900">R$ {r.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-bold ${r.custoPorKm > 5 ? 'text-red-600' : r.custoPorKm > 2 ? 'text-amber-600' : 'text-green-600'}`}>
                        R$ {r.custoPorKm.toFixed(2)}/km
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
