import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Wrench, Plus, Trash2 } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { useRemoverItemOS, type OrdemServicoDetalhe } from '../../hooks/useApi';

interface Props {
  os: OrdemServicoDetalhe;
  isFinalizada: boolean;
  custoItens: number;
  onAdicionar: () => void;
}

export function OSItensTabela({ os, isFinalizada, custoItens, onAdicionar }: Props) {
  const navigate = useNavigate();
  const [confirmRemover, setConfirmRemover] = useState<string | null>(null);
  const removerItem = useRemoverItemOS();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Package size={15} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-700">Itens e Materiais</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{(os.itens ?? []).length}</span>
        {!isFinalizada && (
          <button onClick={onAdicionar} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition print:hidden">
            <Plus size={13} /> Adicionar Item
          </button>
        )}
      </div>

      {(os.itens ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <Package size={24} className="mb-2 opacity-40" />
          <p className="text-xs">Nenhum item lançado nesta OS</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Tipo', 'Material / Descrição', 'Qtd', 'Preço Unit.', 'Total', ''].map((h, i) => (
                  <th key={i} className={`text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 ${h === '' ? 'print:hidden' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(os.itens ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3">
                    {item.tipo === 'material'
                      ? <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full w-fit"><Package size={11} /> Material</span>
                      : <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit"><Wrench size={11} /> Mão de obra</span>}
                  </td>
                  <td className="px-5 py-3">
                    {item.material?.nome ? (
                      <button onClick={() => navigate(`/estoque/${item.material!.id}`)} className="text-sm text-gray-700 hover:text-blue-600 transition text-left" title="Ver material no estoque">
                        {item.material.nome}
                      </button>
                    ) : (
                      <p className="text-sm text-gray-700">{item.descricao ?? '—'}</p>
                    )}
                    {item.material?.codigo && <CopyText text={item.material.codigo} className="text-xs text-gray-400 font-mono mt-0.5" />}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.quantidade}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">R$ {item.precoUnitario.toFixed(2)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900">
                    R$ {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 print:hidden">
                    {!isFinalizada && (
                      confirmRemover === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { removerItem.mutate({ osId: os.id, itemId: item.id }); setConfirmRemover(null); }} className="text-xs text-red-600 font-medium hover:underline">Confirmar</button>
                          <button onClick={() => setConfirmRemover(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemover(item.id)} aria-label="Remover item" className="p-1 text-gray-300 hover:text-red-500 transition rounded">
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700 text-right">Total geral:</td>
                <td className="px-5 py-3 text-sm font-bold text-blue-700">R$ {custoItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
