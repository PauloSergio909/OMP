import { useNavigate } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useComprasKPIs, useCompras, type CompraListItem } from '../../../hooks/useApi';
import { RelDate } from '../../../components/ui/RelDate';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabCompras() {
  const navigate = useNavigate();
  const { data: comprasKPIs } = useComprasKPIs();
  const { data: comprasData } = useCompras(1, undefined, undefined);

  const compras: CompraListItem[] = comprasData?.data ?? [];

  const statusColors: Record<string, string> = {
    pendente: '#f59e0b',
    aprovada: '#3b82f6',
    recebida: '#22c55e',
    cancelada: '#9ca3af',
  };

  const comprasPie = [
    { name: 'Pendente', value: comprasKPIs?.pendentes ?? 0, color: statusColors.pendente },
    { name: 'Aprovada', value: comprasKPIs?.aprovadas ?? 0, color: statusColors.aprovada },
    { name: 'Recebida', value: comprasKPIs?.recebidas ?? 0, color: statusColors.recebida },
    { name: 'Cancelada', value: comprasKPIs?.canceladas ?? 0, color: statusColors.cancelada },
  ].filter((d) => d.value > 0);

  const totalOC = (comprasKPIs?.pendentes ?? 0) + (comprasKPIs?.aprovadas ?? 0) + (comprasKPIs?.recebidas ?? 0) + (comprasKPIs?.canceladas ?? 0);

  function exportarPDF() {
    const kpis = [
      { label: 'Pendentes', value: comprasKPIs?.pendentes ?? '—' },
      { label: 'Aprovadas', value: comprasKPIs?.aprovadas ?? '—' },
      { label: 'Recebidas', value: comprasKPIs?.recebidas ?? '—' },
      { label: 'Valor em Aberto', value: comprasKPIs?.valorEmAberto != null ? `R$ ${(comprasKPIs.valorEmAberto / 1000).toFixed(1)}k` : '—' },
    ];
    const secoes = [{
      titulo: 'Ordens de Compra',
      headers: ['Código', 'Fornecedor', 'Status', 'Itens', 'Valor Total (R$)', 'Data'],
      rows: compras.map((c) => [
        c.codigo ?? '',
        c.fornecedor?.razaoSocial ?? '',
        c.status,
        (c.itens ?? []).length,
        c.valorTotal != null ? Number(c.valorTotal).toFixed(2) : '',
        new Date(c.dataPedido).toLocaleDateString('pt-BR'),
      ]),
    }];
    printDocument(buildRelatorioTabHtml('Compras', kpis, secoes), 'Relatório — Compras');
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
          { label: 'Pendentes', value: comprasKPIs?.pendentes ?? '—', valueClass: 'text-amber-600', subtitle: 'aguardando aprovação', path: '/compras?status=pendente' },
          { label: 'Aprovadas', value: comprasKPIs?.aprovadas ?? '—', valueClass: 'text-blue-600', subtitle: 'em trânsito', path: '/compras?status=aprovada' },
          { label: 'Recebidas', value: comprasKPIs?.recebidas ?? '—', valueClass: 'text-green-600', subtitle: 'concluídas', path: '/compras?status=recebida' },
        ].map(({ label, value, valueClass, subtitle, path }) => (
          <button key={label} onClick={() => navigate(path)} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
            <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
            <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </button>
        ))}
        <button
          onClick={() => navigate((comprasKPIs?.atrasadas ?? 0) > 0 ? '/compras?atrasada=1' : '/compras')}
          className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-red-200 transition"
          title={(comprasKPIs?.atrasadas ?? 0) > 0 ? 'Ver OCs com prazo vencido' : 'Ver todas as OCs'}
        >
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Valor em Aberto</p>
          <p className="text-2xl font-bold text-gray-900">
            {comprasKPIs?.valorEmAberto != null
              ? `R$ ${(comprasKPIs.valorEmAberto / 1000).toFixed(1)}k`
              : '—'}
          </p>
          <p className={`text-xs mt-1 ${(comprasKPIs?.atrasadas ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {(comprasKPIs?.atrasadas ?? 0) > 0
              ? `${comprasKPIs!.atrasadas} atrasada${comprasKPIs!.atrasadas !== 1 ? 's' : ''} — clique para filtrar`
              : 'pendente + aprovado'}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie: distribuição por status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Distribuição por Status</h3>
          <p className="text-xs text-gray-400 mb-4">{totalOC} ordens de compra no total</p>
          {comprasPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
              Nenhuma OC cadastrada
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={comprasPie} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value">
                    {comprasPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number, n: string) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {comprasPie.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 flex-1">{s.name}</span>
                    <span className="font-bold text-gray-900">{s.value}</span>
                    <span className="text-xs text-gray-400">({totalOC > 0 ? Math.round((s.value / totalOC) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Últimas OCs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Últimas Ordens de Compra</h3>
            {compras.length > 0 && (
              <button
                onClick={() => exportCsv(
                  'ordens-compra.csv',
                  ['Código', 'Fornecedor', 'Status', 'Itens', 'Valor Total', 'Data'],
                  compras.map((c) => [
                    c.codigo ?? '',
                    c.fornecedor?.razaoSocial ?? '',
                    c.status,
                    (c.itens ?? []).length,
                    c.valorTotal != null ? Number(c.valorTotal).toFixed(2) : '',
                    new Date(c.dataPedido).toLocaleDateString('pt-BR'),
                  ]),
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
              >
                <Download size={12} /> CSV
              </button>
            )}
          </div>
          {compras.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Nenhuma OC registrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 text-gray-400 font-semibold uppercase">Fornecedor</th>
                    <th className="text-left px-5 py-2.5 text-gray-400 font-semibold uppercase">Status</th>
                    <th className="text-right px-5 py-2.5 text-gray-400 font-semibold uppercase">Valor</th>
                    <th className="text-left px-5 py-2.5 text-gray-400 font-semibold uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compras.slice(0, 8).map((c) => {
                    const statusCls: Record<string, string> = {
                      pendente: 'bg-amber-50 text-amber-700',
                      aprovada: 'bg-blue-50 text-blue-700',
                      recebida: 'bg-green-50 text-green-700',
                      cancelada: 'bg-gray-100 text-gray-500',
                    };
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/compras/${c.id}`)}>
                        <td className="px-5 py-2.5 font-medium text-gray-800 truncate max-w-[140px]">
                          {c.fornecedor?.razaoSocial ? (
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/compras?q=${encodeURIComponent(c.fornecedor!.razaoSocial)}`); }} className="hover:text-blue-600 transition text-left" title="Filtrar OCs deste fornecedor">
                              {c.fornecedor.razaoSocial}
                            </button>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-2.5">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/compras?status=${c.status}`); }} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize hover:opacity-75 transition ${statusCls[c.status] ?? 'bg-gray-100 text-gray-500'}`} title={`Ver OCs com status ${c.status}`}>
                            {c.status}
                          </button>
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                          {c.valorTotal != null ? `R$ ${Number(c.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500">
                          <RelDate date={c.dataPedido} />
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
    </div>
  );
}
