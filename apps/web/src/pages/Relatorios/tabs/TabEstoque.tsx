import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, Download, FileText } from 'lucide-react';
import { useEstoqueKPIs, useEstoqueAlertas } from '../../../hooks/useApi';
import { CopyText } from '../../../components/ui/CopyText';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabEstoque() {
  const navigate = useNavigate();
  const { data: estoqueKPIs } = useEstoqueKPIs();
  const { data: alertasEstoque = [] } = useEstoqueAlertas();

  function exportarPDF() {
    const kpis = [
      { label: 'Total de Materiais', value: estoqueKPIs?.totalMateriais ?? '—' },
      { label: 'Abaixo do Mínimo', value: estoqueKPIs?.itensAbaixoMinimo ?? '—' },
      { label: 'Valor em Estoque', value: estoqueKPIs?.valorEstoque ? `R$ ${(estoqueKPIs.valorEstoque / 1000).toFixed(1)}k` : '—' },
    ];
    const secoes = [{
      titulo: 'Itens Abaixo do Estoque Mínimo',
      headers: ['Material', 'Código', 'Unidade', 'Qtd Atual', 'Mínimo', 'Déficit', 'Status'],
      rows: alertasEstoque.map((m) => {
        const qtd = m.estoques?.[0]?.quantidade ?? 0;
        return [m.nome, m.codigo ?? '', m.unidadeMedida, qtd, m.estoqueMinimo, Math.max(0, m.estoqueMinimo - qtd), qtd === 0 ? 'ZERADO' : 'CRÍTICO'];
      }),
    }];
    printDocument(buildRelatorioTabHtml('Estoque', kpis, secoes), 'Relatório — Estoque');
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

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Materiais', value: estoqueKPIs?.totalMateriais ?? '—', subtitle: 'itens cadastrados', cls: 'bg-blue-50 border-blue-100 hover:border-blue-300', labelCls: 'text-blue-600', valueCls: 'text-blue-700', subtitleCls: 'text-blue-500', path: '/estoque' },
          { label: 'Abaixo do Mínimo', value: estoqueKPIs?.itensAbaixoMinimo ?? '—', subtitle: 'precisam de reposição', cls: 'bg-red-50 border-red-100 hover:border-red-300', labelCls: 'text-red-600', valueCls: 'text-red-700', subtitleCls: 'text-red-500', path: '/estoque?critico=1' },
          { label: 'Valor Total', value: estoqueKPIs?.valorEstoque ? `R$ ${(estoqueKPIs.valorEstoque / 1000).toFixed(1)}k` : '—', subtitle: 'em estoque', cls: 'bg-green-50 border-green-100 hover:border-green-300', labelCls: 'text-green-600', valueCls: 'text-green-700', subtitleCls: 'text-green-500', path: '/estoque' },
        ].map(({ label, value, subtitle, cls, labelCls, valueCls, subtitleCls, path }) => (
          <button key={label} onClick={() => navigate(path)} className={`text-left p-4 rounded-xl border transition ${cls}`}>
            <p className={`text-xs font-semibold uppercase mb-1 ${labelCls}`}>{label}</p>
            <p className={`text-3xl font-bold ${valueCls}`}>{value}</p>
            <p className={`text-xs mt-1 ${subtitleCls}`}>{subtitle}</p>
          </button>
        ))}
      </div>

      {/* Lista de itens críticos */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900">Itens Abaixo do Estoque Mínimo</h3>
            {alertasEstoque.length > 0 && (
              <button onClick={() => navigate('/estoque?critico=1')} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium hover:bg-red-100 transition" title="Ver itens críticos no estoque">
                {alertasEstoque.length}
              </button>
            )}
          </div>
          {alertasEstoque.length > 0 && (
            <button
              onClick={() => exportCsv(
                'estoque-critico.csv',
                ['Código', 'Material', 'Unidade', 'Qtd Atual', 'Estoque Mínimo', 'Déficit', 'Status'],
                alertasEstoque.map((m) => {
                  const qtd = m.estoques?.[0]?.quantidade ?? 0;
                  return [m.codigo ?? '', m.nome, m.unidadeMedida, qtd, m.estoqueMinimo, Math.max(0, m.estoqueMinimo - qtd), qtd === 0 ? 'ZERADO' : 'CRÍTICO'];
                }),
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
            >
              <Download size={12} /> CSV
            </button>
          )}
        </div>

        {alertasEstoque.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-gray-400">
            <Package size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhum item abaixo do mínimo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-400 font-semibold uppercase">Material</th>
                  <th className="text-right px-5 py-3 text-gray-400 font-semibold uppercase">Qtd Atual</th>
                  <th className="text-right px-5 py-3 text-gray-400 font-semibold uppercase">Mínimo</th>
                  <th className="text-right px-5 py-3 text-gray-400 font-semibold uppercase">Déficit</th>
                  <th className="text-center px-5 py-3 text-gray-400 font-semibold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alertasEstoque.map((m) => {
                  const qtd = m.estoques?.[0]?.quantidade ?? 0;
                  const zerado = qtd === 0;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/estoque/${m.id}`)}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{m.nome}</p>
                        {m.codigo && <CopyText text={m.codigo} className="text-xs text-gray-400 font-mono" />}
                        <p className="text-gray-400 mt-0.5">{m.unidadeMedida}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{qtd}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{m.estoqueMinimo}</td>
                      <td className="px-5 py-3 text-right font-semibold text-red-600">
                        {Math.max(0, m.estoqueMinimo - qtd)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); navigate('/estoque?critico=1'); }} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold hover:opacity-75 transition ${zerado ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`} title="Ver materiais críticos no estoque">
                          {zerado ? 'Zerado' : 'Crítico'}
                        </button>
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
