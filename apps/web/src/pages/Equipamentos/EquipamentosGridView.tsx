import { useNavigate } from 'react-router-dom';
import { Edit, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RelDate } from '../../components/ui/RelDate';
import { tipoLabels, statusColors } from './equipamentos.constants';
import type { EquipamentoListItem } from '../../hooks/useApi';

interface Props {
  equipamentos: EquipamentoListItem[];
  onEditar: (eq: EquipamentoListItem) => void;
  onMovimentar: (id: string) => void;
  onFiltrarTipo: (tipo: string) => void;
  onFiltrarStatus: (status: string) => void;
  onSwitchToList: () => void;
}

export function EquipamentosGridView({ equipamentos, onEditar, onMovimentar, onFiltrarTipo, onFiltrarStatus, onSwitchToList }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {equipamentos.map((eq) => (
        <div key={eq.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
          <div className={`h-1.5 ${statusColors[eq.status] ?? 'bg-gray-300'}`} />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <CopyText text={eq.codigo} className="text-xs font-mono font-bold text-blue-600" />
                  <button
                    onClick={() => { onFiltrarTipo(eq.tipo); onSwitchToList(); }}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-200 transition"
                    title={`Filtrar por tipo: ${tipoLabels[eq.tipo] ?? eq.tipo}`}
                  >
                    {tipoLabels[eq.tipo] ?? eq.tipo}
                  </button>
                </div>
                <h3 className="text-sm font-bold text-gray-900 truncate">{eq.nome}</h3>
                {eq.modelo && <p className="text-xs text-gray-500 mt-0.5">{eq.fabricante} {eq.modelo}</p>}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => { onFiltrarStatus(eq.status); onSwitchToList(); }}
                  className="hover:opacity-75 transition"
                  title={`Filtrar por status: ${eq.status}`}
                >
                  <StatusBadge status={eq.status} />
                </button>
                <button
                  onClick={() => onEditar(eq)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition text-gray-400"
                  aria-label="Editar equipamento"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
              {eq.localizacao && (
                <div><span className="text-gray-400">Local:</span> <span className="font-medium text-gray-700">{eq.localizacao}</span></div>
              )}
              {eq.numeroSerie && (
                <div><span className="text-gray-400">N° Série:</span> <span className="font-medium text-gray-700">{eq.numeroSerie}</span></div>
              )}
              {eq.responsavel && (
                <div className="col-span-2">
                  <span className="text-gray-400">Responsável:</span>{' '}
                  <button
                    onClick={() => navigate(`/funcionarios/${eq.responsavel!.id}`)}
                    className="font-medium text-gray-700 hover:text-blue-600 transition"
                    title="Ver perfil do responsável"
                  >
                    {eq.responsavel.nome}
                  </button>
                </div>
              )}
              {eq.proximaRevisao && (
                <div className="col-span-2">
                  <span className="text-gray-400">Próx. revisão:</span>{' '}
                  <span className="font-medium text-amber-600">
                    <RelDate date={eq.proximaRevisao!} />
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              {eq.valorAquisicao ? (
                <span className="text-xs text-gray-400">
                  R$ {eq.valorAquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMovimentar(eq.id)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ArrowLeftRight size={12} /> Movimentar
                </button>
                <button
                  onClick={() => navigate(`/equipamentos/${eq.id}`)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition"
                  title="Ver detalhe"
                >
                  <ExternalLink size={12} /> Detalhe
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
