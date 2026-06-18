import { useMemo } from 'react';
import { Package, TrendingUp, Download, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { exportCsv } from '../../utils/exportCsv';
import { RelDate } from '../../components/ui/RelDate';
import { tipoLabels, tipoColors } from './material.constants';
import type { MaterialDetalhe } from '../../hooks/useApi';

interface Props {
  material: MaterialDetalhe;
  qtdAtual: number;
  onEntrada: () => void;
  onSaida: () => void;
}

export function MaterialMovimentacoesTabela({ material, qtdAtual, onEntrada, onSaida }: Props) {
  const movimentacoes = material.movimentacoes ?? [];

  const saldosPorId = useMemo(() => {
    const map = new Map<string, number>();
    let saldo = qtdAtual;
    for (const m of movimentacoes) {
      map.set(m.id, saldo);
      if (m.tipo === 'entrada') saldo -= m.quantidade;
      else if (m.tipo === 'saida') saldo += m.quantidade;
    }
    return map;
  }, [movimentacoes, qtdAtual]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Últimas Movimentações</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{movimentacoes.length}</span>
          {movimentacoes.length === 50 && (
            <span className="text-xs text-amber-600 font-medium">(exibindo as 50 mais recentes)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {movimentacoes.length > 0 && (
            <button
              onClick={() => exportCsv(
                `movimentacoes-${material.codigo}`,
                ['Data', 'Tipo', 'Qtd', 'Preço Unit. (R$)', 'Total (R$)', 'Motivo', 'Usuário'],
                movimentacoes.map((m) => [
                  new Date(m.createdAt).toLocaleDateString('pt-BR'),
                  m.tipo, m.quantidade, m.precoUnitario.toFixed(2),
                  (m.quantidade * m.precoUnitario).toFixed(2), m.motivo, m.usuario?.nome ?? '—',
                ]),
              )}
              className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition print:hidden"
              title="Exportar movimentações em CSV"
            >
              <Download size={12} /> CSV
            </button>
          )}
          <button onClick={onEntrada} className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition">
            <ArrowDownToLine size={12} /> Entrada
          </button>
          <button onClick={onSaida} className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition">
            <ArrowUpFromLine size={12} /> Saída
          </button>
        </div>
      </div>

      {movimentacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package size={28} className="text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">Nenhuma movimentação registrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['Tipo', 'Quantidade', 'Saldo', 'Preço Unit.', 'Motivo', 'Responsável', 'Data'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movimentacoes.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${tipoColors[mov.tipo] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {tipoLabels[mov.tipo] ?? mov.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-bold ${mov.tipo === 'saida' ? 'text-red-600' : mov.tipo === 'entrada' ? 'text-green-700' : 'text-gray-700'}`}>
                      {mov.tipo === 'saida' ? '-' : '+'}{mov.quantidade} {material.unidadeMedida}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {(() => {
                      const saldo = saldosPorId.get(mov.id) ?? 0;
                      const abaixo = saldo < material.estoqueMinimo;
                      return (
                        <span className={`text-sm font-bold ${abaixo ? 'text-red-600' : 'text-gray-800'}`}>
                          {saldo} {material.unidadeMedida}
                          {abaixo && <span className="ml-1 text-[10px] font-semibold text-red-500">↓mín</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">R$ {mov.precoUnitario.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 max-w-xs"><span className="line-clamp-1">{mov.motivo}</span></td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{mov.usuario?.nome ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    <RelDate date={mov.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
