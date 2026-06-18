import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ClipboardList, Download, FileText } from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  useOrdensServicoKPIs, useOsPorMecanico, useOSTendenciaMensal, useOSTempoMedio,
} from '../../../hooks/useApi';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabOrdensServico() {
  const navigate = useNavigate();
  const [mesesOS, setMesesOS] = useState(6);

  const { data: osKPIs } = useOrdensServicoKPIs();
  const { data: osMecanicos = [] } = useOsPorMecanico();
  const { data: osTendencia = [] } = useOSTendenciaMensal(mesesOS);
  const { data: osTempoMedio } = useOSTempoMedio();

  const taxaPreventiva = osKPIs?.taxaPreventiva ?? 0;
  const taxaCorretiva = osKPIs ? +(100 - taxaPreventiva).toFixed(1) : 0;
  const tiposOS = useMemo(() => [
    { name: 'Preventiva', value: taxaPreventiva, color: '#06D6A0' },
    { name: 'Corretiva', value: taxaCorretiva, color: '#EF476F' },
  ], [taxaPreventiva, taxaCorretiva]);

  function exportarPDF() {
    const kpis = [
      { label: 'OS Abertas', value: osKPIs?.abertas ?? '—' },
      { label: 'Concluídas (mês)', value: osKPIs?.concluidasMes ?? '—' },
      { label: 'Tempo Médio (dias)', value: osTempoMedio?.mediaDias != null ? `${osTempoMedio.mediaDias}d` : '—' },
      { label: '% Preventiva', value: osKPIs ? `${osKPIs.taxaPreventiva}%` : '—' },
      { label: 'Custo OS (mês)', value: osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—' },
    ];
    const secoes = [
      {
        titulo: 'OS por Mecânico / Responsável',
        headers: ['Mecânico', 'Cargo', 'Abertas', 'Concluídas', 'Total'],
        rows: osMecanicos.map((m) => [m.nome, m.cargo, m.abertas, m.concluidas, m.total]),
      },
      {
        titulo: `Tendência Mensal (últimos ${mesesOS} meses)`,
        headers: ['Mês', 'Abertas', 'Concluídas', 'Custo (R$)'],
        rows: osTendencia.map((r) => [r.mes, r.abertas, r.concluidas, r.custo.toFixed(2)]),
      },
    ];
    printDocument(buildRelatorioTabHtml('Ordens de Serviço', kpis, secoes), 'Relatório — Ordens de Serviço');
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button onClick={() => navigate((osKPIs?.atrasadas ?? 0) > 0 ? '/ordens-servico?view=lista&atrasada=1' : '/ordens-servico?view=lista')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition" title={(osKPIs?.atrasadas ?? 0) > 0 ? 'Ver OS atrasadas' : 'Ver OS abertas'}>
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">OS Abertas</p>
          <p className="text-2xl font-bold text-gray-900">{osKPIs?.abertas ?? '—'}</p>
          <p className={`text-xs mt-1 ${(osKPIs?.atrasadas ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {(osKPIs?.atrasadas ?? 0) > 0 ? `${osKPIs?.atrasadas} atrasada${osKPIs?.atrasadas !== 1 ? 's' : ''}` : `${osKPIs?.urgentes ?? 0} crítica(s)`}
          </p>
        </button>
        <button onClick={() => navigate('/ordens-servico?view=lista&status=concluida')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-green-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Concluídas (mês)</p>
          <p className="text-2xl font-bold text-green-700">{osKPIs?.concluidasMes ?? '—'}</p>
        </button>
        <button onClick={() => navigate('/ordens-servico?view=lista&tipo=preventiva')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">% Preventiva</p>
          <p className={`text-2xl font-bold ${taxaPreventiva >= 70 ? 'text-green-700' : 'text-red-600'}`}>
            {osKPIs ? `${osKPIs.taxaPreventiva}%` : '—'}
          </p>
          <p className={`text-xs mt-1 ${taxaPreventiva >= 70 ? 'text-green-600' : 'text-red-500'}`}>
            {taxaPreventiva >= 70 ? '✓ meta atingida' : '⚠ abaixo da meta'}
          </p>
        </button>
        <button onClick={() => navigate('/ordens-servico?view=lista&status=concluida')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-purple-200 transition">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Custo OS (mês)</p>
          <p className="text-2xl font-bold text-gray-900">
            {osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—'}
          </p>
        </button>
        <div className="text-left bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Tempo Médio</p>
          <p className="text-2xl font-bold text-gray-900">
            {osTempoMedio?.mediaDias != null ? `${osTempoMedio.mediaDias}d` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {osTempoMedio ? `${osTempoMedio.totalConcluidas} OS concluídas` : 'por OS concluída'}
          </p>
          {osTempoMedio?.porTipo && osTempoMedio.porTipo.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
              {osTempoMedio.porTipo.map((t) => (
                <div key={t.tipo} className="flex justify-between items-center text-xs">
                  <span className="capitalize text-gray-500">{t.tipo}</span>
                  <span className="font-semibold text-gray-700">{t.mediaDias != null ? `${t.mediaDias}d` : '—'} <span className="text-gray-400 font-normal">({t.total})</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela: OS por mecânico */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">OS por Mecânico / Responsável</h3>
          </div>
          {osMecanicos.length > 0 && (
            <button
              onClick={() => exportCsv(
                'os-por-mecanico.csv',
                ['Mecânico', 'Cargo', 'OS Abertas', 'OS Concluídas', 'Total'],
                osMecanicos.map((m) => [m.nome, m.cargo, m.abertas, m.concluidas, m.total]),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          )}
        </div>
        {osMecanicos.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            <Wrench size={28} className="mx-auto mb-2 opacity-30" />
            Nenhuma OS registrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Mecânico', 'Cargo', 'Abertas', 'Concluídas', 'Total', 'Distribuição'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {osMecanicos.map((m) => {
                  const maxTotal = Math.max(...osMecanicos.map((x) => x.total), 1);
                  const pct = Math.round((m.total / maxTotal) * 100);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/funcionarios/${m.id}`)}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition text-left"
                          title="Ver perfil do funcionário"
                        >
                          {m.nome}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/funcionarios?cargo=${m.cargo}`)}
                          className="text-sm text-gray-500 capitalize hover:text-blue-600 transition text-left"
                          title={`Ver funcionários com cargo ${m.cargo}`}
                        >
                          {m.cargo}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-amber-600">{m.abertas}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-green-600">{m.concluidas}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900">{m.total}</td>
                      <td className="px-5 py-3.5 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gráfico de tendência mensal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tendência Mensal de OS</h3>
            <p className="text-xs text-gray-400 mt-0.5">OS abertas e concluídas por mês</p>
          </div>
          <select
            value={mesesOS}
            onChange={(e) => setMesesOS(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 print:hidden"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>
        {osTendencia.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            <ClipboardList size={28} className="mr-2 opacity-30" /> Nenhum dado no período
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={osTendencia}>
                <defs>
                  <linearGradient id="gradAbertas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number, name: string) => [v, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="abertas" stroke="#f59e0b" strokeWidth={2} fill="url(#gradAbertas)" dot={{ r: 4 }} name="Abertas" />
                <Area type="monotone" dataKey="concluidas" stroke="#22c55e" strokeWidth={2} fill="url(#gradConcluidas)" dot={{ r: 4 }} name="Concluídas" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex justify-end print:hidden">
              <button
                onClick={() => exportCsv(
                  `os-tendencia-${mesesOS}meses.csv`,
                  ['Mês', 'Abertas', 'Concluídas', 'Custo OS (R$)'],
                  osTendencia.map((r) => [r.mes, r.abertas, r.concluidas, r.custo.toFixed(2)]),
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </>
        )}
      </div>

      {/* Gráfico preventiva vs corretiva (pie) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Distribuição Preventiva × Corretiva</h3>
        <p className="text-xs text-gray-400 mb-4">Mês corrente — OS abertas no período</p>
        <div className="flex items-center gap-8">
          <ResponsiveContainer width="200px" height={160}>
            <PieChart>
              <Pie
                data={tiposOS}
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={72}
                paddingAngle={3} dataKey="value"
              >
                {tiposOS.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 flex-1">
            {tiposOS.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-sm text-gray-600 flex-1">{t.name}</span>
                <span className="text-lg font-bold text-gray-900">{t.value}%</span>
              </div>
            ))}
            <p className={`text-xs font-medium pt-1 ${taxaPreventiva >= 70 ? 'text-green-600' : 'text-red-500'}`}>
              {taxaPreventiva >= 70 ? '✓ Meta atingida (>70% preventiva)' : '⚠ Abaixo da meta (>70%)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
