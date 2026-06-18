import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, Download, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useEquipamentosKPIs, useEquipamentosRevisoesVencendo } from '../../../hooks/useApi';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabEquipamentos() {
  const navigate = useNavigate();
  const { data: equipKPIs } = useEquipamentosKPIs();
  const { data: equipsRevisao = [] } = useEquipamentosRevisoesVencendo();

  function exportarPDF() {
    const kpis = [
      { label: 'Total', value: equipKPIs?.total ?? '—' },
      { label: 'Disponíveis', value: equipKPIs?.disponiveis ?? '—' },
      { label: 'Em Uso', value: equipKPIs?.emUso ?? '—' },
      { label: 'Em Manutenção', value: equipKPIs?.manutencao ?? '—' },
      { label: 'Revisão Vencendo', value: equipKPIs?.revisaoVencendo ?? '—' },
      { label: 'Patrimônio', value: equipKPIs?.valorPatrimonio ? `R$ ${(equipKPIs.valorPatrimonio / 1000).toFixed(1)}k` : '—' },
    ];
    const secoes = equipsRevisao.length > 0 ? [{
      titulo: 'Revisões Vencendo / Vencidas (30 dias)',
      headers: ['Código', 'Nome', 'Tipo', 'Próx. Revisão', 'Status'],
      rows: equipsRevisao.map((e) => {
        const d = e.proximaRevisao ? Math.ceil((new Date(e.proximaRevisao).getTime() - Date.now()) / 86400000) : null;
        return [e.codigo, e.nome, e.tipo, e.proximaRevisao ? new Date(e.proximaRevisao).toLocaleDateString('pt-BR') : '—', d !== null && d < 0 ? 'VENCIDA' : 'VENCENDO'];
      }),
    }] : [];
    printDocument(buildRelatorioTabHtml('Equipamentos', kpis, secoes), 'Relatório — Equipamentos');
  }

  const pieData = [
    { name: 'Disponível', value: equipKPIs?.disponiveis ?? 0, fill: '#22c55e' },
    { name: 'Em Uso', value: equipKPIs?.emUso ?? 0, fill: '#f59e0b' },
    { name: 'Manutenção', value: equipKPIs?.manutencao ?? 0, fill: '#ef4444' },
  ].filter((d) => d.value > 0);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: equipKPIs?.total, cls: 'bg-blue-50 border-blue-100 hover:border-blue-300', labelCls: 'text-blue-600', valueCls: 'text-blue-700', path: '/equipamentos' },
          { label: 'Disponíveis', value: equipKPIs?.disponiveis, cls: 'bg-green-50 border-green-100 hover:border-green-300', labelCls: 'text-green-600', valueCls: 'text-green-700', path: '/equipamentos?status=disponivel' },
          { label: 'Em Uso', value: equipKPIs?.emUso, cls: 'bg-amber-50 border-amber-100 hover:border-amber-300', labelCls: 'text-amber-600', valueCls: 'text-amber-700', path: '/equipamentos?status=em_uso' },
          { label: 'Manutenção', value: equipKPIs?.manutencao, cls: 'bg-orange-50 border-orange-100 hover:border-orange-300', labelCls: 'text-orange-600', valueCls: 'text-orange-700', path: '/equipamentos?status=manutencao' },
          { label: 'Revisão Vencendo', value: equipKPIs?.revisaoVencendo, cls: 'bg-red-50 border-red-100 hover:border-red-300', labelCls: 'text-red-600', valueCls: 'text-red-700', path: '/equipamentos?revisao=1' },
        ].map(({ label, value, cls, labelCls, valueCls, path }) => (
          <button key={label} onClick={() => navigate(path)} className={`text-left p-4 rounded-xl border transition ${cls}`}>
            <p className={`text-xs font-semibold uppercase mb-1 ${labelCls}`}>{label}</p>
            <p className={`text-3xl font-bold ${valueCls}`}>{value ?? '—'}</p>
          </button>
        ))}
        <div className="text-left p-4 rounded-xl bg-purple-50 border border-purple-100">
          <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Patrimônio</p>
          <p className="text-2xl font-bold text-purple-700">
            {equipKPIs?.valorPatrimonio ? `R$ ${(equipKPIs.valorPatrimonio / 1000).toFixed(1)}k` : '—'}
          </p>
        </div>
      </div>

      {/* Distribuição por status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wrench size={14} className="text-gray-400" /> Distribuição por Status
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} equipamentos`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revisões vencendo */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Revisões Vencendo (próximos 30 dias)</h3>
            {equipsRevisao.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">{equipsRevisao.length}</span>
            )}
          </div>
          {equipsRevisao.length > 0 && (
            <button
              onClick={() => exportCsv(
                'equipamentos-revisao.csv',
                ['Código', 'Nome', 'Tipo', 'Status', 'Próxima Revisão', 'Situação'],
                equipsRevisao.map((e) => {
                  const d = e.proximaRevisao ? Math.ceil((new Date(e.proximaRevisao).getTime() - Date.now()) / 86400000) : null;
                  return [e.codigo, e.nome, e.tipo, e.status, e.proximaRevisao ? new Date(e.proximaRevisao).toLocaleDateString('pt-BR') : '—', d !== null && d < 0 ? 'VENCIDA' : 'VENCENDO'];
                }),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          )}
        </div>
        {equipsRevisao.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-gray-400">
            <Wrench size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhuma revisão vencendo nos próximos 30 dias</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Código', 'Nome', 'Tipo', 'Status', 'Próx. Revisão', 'Situação'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-gray-400 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {equipsRevisao.map((e) => {
                  const d = e.proximaRevisao ? Math.ceil((new Date(e.proximaRevisao).getTime() - Date.now()) / 86400000) : null;
                  const vencida = d !== null && d < 0;
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/equipamentos/${e.id}`)}>
                      <td className="px-5 py-3 font-mono font-semibold text-blue-600">{e.codigo}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{e.nome}</td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{e.tipo}</td>
                      <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-5 py-3 text-gray-600">{e.proximaRevisao ? new Date(e.proximaRevisao).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${vencida ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {vencida ? `Vencida há ${Math.abs(d!)}d` : `${d}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
