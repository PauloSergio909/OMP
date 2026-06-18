import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { relativeDate } from '../../utils/formatDate';
import { CopyText } from '../../components/ui/CopyText';
import type { MovimentacaoListItem } from '../../hooks/useApi';

interface Props {
  movimentacoes: MovimentacaoListItem[];
  onFiltrarMaterial: (nome: string) => void;
}

export function MovimentacoesRecentes({ movimentacoes, onFiltrarMaterial }: Props) {
  const navigate = useNavigate();

  if (movimentacoes.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ArrowDownToLine size={15} className="text-green-500" />
        <h3 className="text-sm font-semibold text-gray-900">Últimas Movimentações</h3>
        <span className="ml-auto text-xs text-gray-400">15 mais recentes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Data', 'Tipo', 'Material', 'Qtd', 'Preço Unit.', 'Motivo', 'Usuário'].map((h) => (
                <th key={h} className="sticky top-0 z-10 bg-white border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movimentacoes.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {(() => {
                    const r = relativeDate(m.createdAt);
                    const time = new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return <span title={`${r.title} ${time}`}>{r.label} {time}</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  {m.tipo === 'entrada'
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><ArrowDownToLine size={10} /> Entrada</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full"><ArrowUpFromLine size={10} /> Saída</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {m.material?.nome ? (
                    <button
                      onClick={() => onFiltrarMaterial(m.material!.nome)}
                      className="text-xs font-medium text-gray-800 hover:text-blue-600 transition text-left"
                      title="Filtrar por este material"
                    >
                      {m.material.nome}
                    </button>
                  ) : <span className="text-xs text-gray-400">—</span>}
                  {m.material?.codigo && <CopyText text={m.material.codigo} className="text-[11px] text-gray-400 font-mono" />}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} {m.material?.unidadeMedida}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">R$ {m.precoUnitario.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">{m.motivo}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {m.usuario ? (
                    <button onClick={() => navigate(`/funcionarios/${m.usuario!.id}`)} className="hover:text-blue-600 transition text-left">
                      {m.usuario.nome}
                    </button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
