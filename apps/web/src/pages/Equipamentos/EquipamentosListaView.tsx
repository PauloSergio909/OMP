import { useNavigate } from 'react-router-dom';
import { Edit, ExternalLink } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RelDate } from '../../components/ui/RelDate';
import { tipoLabels } from './equipamentos.constants';
import type { EquipamentoListItem } from '../../hooks/useApi';

interface Props {
  equipamentos: EquipamentoListItem[];
  onEditar: (eq: EquipamentoListItem) => void;
  onMovimentar: (id: string) => void;
  onFiltrarTipo: (tipo: string) => void;
  onFiltrarStatus: (status: string) => void;
}

export function EquipamentosListaView({ equipamentos, onEditar, onMovimentar, onFiltrarTipo, onFiltrarStatus }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Código', 'Nome / Modelo', 'Tipo', 'Localização', 'Responsável', 'Status', 'Próx. Revisão', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {equipamentos.map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50/50 transition group cursor-pointer" onClick={() => navigate(`/equipamentos/${eq.id}`)}>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <CopyText text={eq.codigo} className="text-sm font-mono font-bold text-blue-600" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{eq.nome}</p>
                  {eq.modelo && <p className="text-xs text-gray-400">{eq.fabricante} {eq.modelo}</p>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onFiltrarTipo(eq.tipo); }}
                    className="text-sm text-gray-500 hover:text-blue-600 transition text-left"
                    title={`Filtrar por tipo: ${tipoLabels[eq.tipo] ?? eq.tipo}`}
                  >
                    {tipoLabels[eq.tipo] ?? eq.tipo}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{eq.localizacao ?? '—'}</td>
                <td className="px-4 py-3">
                  {eq.responsavel ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${eq.responsavel!.id}`); }}
                      className="text-sm text-gray-700 hover:text-blue-600 transition text-left"
                      title="Ver perfil do responsável"
                    >
                      {eq.responsavel.nome}
                    </button>
                  ) : <span className="text-sm text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onFiltrarStatus(eq.status); }}
                    className="hover:opacity-75 transition text-left"
                    title={`Filtrar por status: ${eq.status}`}
                  >
                    <StatusBadge status={eq.status} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  {eq.proximaRevisao
                    ? <RelDate date={eq.proximaRevisao!} className="text-sm text-amber-600" />
                    : <span className="text-sm text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onMovimentar(eq.id); }}
                      className="text-xs text-blue-600 hover:underline font-medium opacity-0 group-hover:opacity-100"
                      title="Movimentar equipamento"
                    >
                      Movimentar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditar(eq); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition opacity-0 group-hover:opacity-100"
                      title="Editar equipamento"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => navigate(`/equipamentos/${eq.id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
                      title="Ver detalhe do equipamento"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
