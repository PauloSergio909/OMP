import { useNavigate } from 'react-router-dom';
import { Calendar, Truck, User, ExternalLink, AlertCircle, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { RelDate } from '../../components/ui/RelDate';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { allowedTransitions, statusLabels, prioridadeBorder } from './os.constants';
import type { OrdemServicoListItem } from '../../hooks/useApi';

interface DraggableOSCardProps {
  os: OrdemServicoListItem;
  atrasada: boolean;
  onMove: (os: OrdemServicoListItem, status: string) => void;
  onFilterPrioridade?: (p: string) => void;
}

export function DraggableOSCard({ os, atrasada, onMove, onFilterPrioridade }: DraggableOSCardProps) {
  const navigate = useNavigate();
  const isTerminal = os.status === 'concluida' || os.status === 'cancelada';
  const nextStatuses = allowedTransitions[os.status] ?? [];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: os.id,
    data: { currentStatus: os.status },
    disabled: isTerminal,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <div className={`relative bg-white rounded-xl border border-gray-100 p-4 border-l-[3px] ${prioridadeBorder[os.prioridade]} hover:shadow-md transition-shadow`}>
        {!isTerminal && (
          <button
            {...attributes}
            {...listeners}
            className="absolute top-3 right-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
            aria-label="Arrastar OS"
          >
            <GripVertical size={14} />
          </button>
        )}

        <div className="flex items-center justify-between mb-2 pr-5">
          <CopyText text={os.codigo} className="text-xs font-mono font-bold text-blue-600" />
          <div className="flex items-center gap-1.5">
            {atrasada && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={9} /> Atrasada
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&tipo=${os.tipo}`); }}
              className="hover:opacity-75 transition"
              title={`Ver todas as OS do tipo ${os.tipo}`}
            >
              <StatusBadge status={os.tipo} />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-3 line-clamp-2 leading-snug">{os.descricao}</p>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Truck size={12} className="text-gray-400" />
            {os.caminhao ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/frota/${os.caminhao!.id}`); }}
                className="hover:text-blue-600 transition text-left"
                title="Ver veículo"
              >
                <CopyText text={os.caminhao.codigo} className="font-mono" /> • {os.caminhao.modelo}
              </button>
            ) : <span>—</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={12} className="text-gray-400" />
            {os.responsavel ? (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${os.responsavel!.id}`); }}
                className="hover:text-blue-600 transition text-left"
                title="Ver perfil do responsável"
              >
                {os.responsavel.nome}
              </button>
            ) : <span>—</span>}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar size={12} className="text-gray-400" />
              <RelDate date={os.dataPrevisao} />
            </div>
            {onFilterPrioridade ? (
              <button
                onClick={(e) => { e.stopPropagation(); onFilterPrioridade(os.prioridade); }}
                className="hover:opacity-75 transition"
                title={`Filtrar por prioridade ${os.prioridade}`}
              >
                <StatusBadge status={os.prioridade} />
              </button>
            ) : <StatusBadge status={os.prioridade} />}
          </div>
        </div>

        {os.custoTotal && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Custo</span>
            <span className="text-sm font-bold text-gray-900">R$ {os.custoTotal.toLocaleString('pt-BR')}</span>
          </div>
        )}

        <button
          onClick={() => navigate(`/ordens-servico/${os.id}`)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
        >
          <ExternalLink size={11} /> Ver detalhes
        </button>

        {!isTerminal && nextStatuses.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <select
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
              defaultValue=""
              onChange={(e) => { if (e.target.value) onMove(os, e.target.value); }}
            >
              <option value="" disabled>Mover para...</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export function OSCardOverlay({ os }: { os: OrdemServicoListItem }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 border-l-[3px] ${prioridadeBorder[os.prioridade]} shadow-xl opacity-95 rotate-1 cursor-grabbing w-64`}>
      <div className="flex items-center gap-1.5 mb-2">
        <GripVertical size={14} className="text-gray-400" />
        <CopyText text={os.codigo} className="text-xs font-mono font-bold text-blue-600" />
      </div>
      <p className="text-sm text-gray-700 line-clamp-2 leading-snug">{os.descricao}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
        <Truck size={12} className="text-gray-400" />
        <span>{os.caminhao?.codigo}</span>
      </div>
    </div>
  );
}

export function DroppableKanbanColumn({
  column, count, custoTotal, children,
}: {
  column: (typeof import('./os.constants').kanbanColumns)[number];
  count: number;
  custoTotal: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  return (
    <div className="min-h-[200px] flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
        <h3 className="text-sm font-semibold text-gray-700">{column.label}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-auto">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 min-h-[80px] rounded-xl p-1 -m-1 transition-colors duration-150 ${isOver ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
      >
        {children}
      </div>
      {custoTotal > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 px-1">
          <p className="text-[11px] text-gray-400">
            Total: <span className="font-semibold text-gray-600">R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </p>
        </div>
      )}
    </div>
  );
}
