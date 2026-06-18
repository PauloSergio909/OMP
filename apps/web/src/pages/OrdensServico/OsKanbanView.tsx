import { useState } from 'react';
import { ClipboardX, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DraggableOSCard, OSCardOverlay, DroppableKanbanColumn } from './KanbanCard';
import { kanbanColumns, allowedTransitions, statusLabels, isAtrasada } from './os.constants';
import type { OrdemServicoListItem } from '../../hooks/useApi';

interface CaminhaoRef { id: string; codigo: string; placa: string; }

interface Props {
  ordens: OrdemServicoListItem[];
  isLoading: boolean;
  caminhoes: CaminhaoRef[];
  onMove: (os: OrdemServicoListItem, status: string) => void;
  onRefetch: () => void;
}

export function OsKanbanView({ ordens, isLoading, caminhoes, onMove, onRefetch }: Props) {
  const [kanbanPrioridade, setKanbanPrioridade] = useState('');
  const [kanbanCaminhao, setKanbanCaminhao] = useState('');
  const [kanbanSoAtrasadas, setKanbanSoAtrasadas] = useState(false);
  const [activeOsId, setActiveOsId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const ordensKanban = ordens.filter((os) => {
    if (kanbanPrioridade && os.prioridade !== kanbanPrioridade) return false;
    if (kanbanCaminhao && os.caminhao?.id !== kanbanCaminhao) return false;
    if (kanbanSoAtrasadas && !isAtrasada(os)) return false;
    return true;
  });

  const kanbanAtrasadas = ordens.filter((os) => {
    if (kanbanPrioridade && os.prioridade !== kanbanPrioridade) return false;
    if (kanbanCaminhao && os.caminhao?.id !== kanbanCaminhao) return false;
    return isAtrasada(os);
  }).length;

  const activeOs = activeOsId ? ordens.find((o) => o.id === activeOsId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveOsId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveOsId(null);
    if (!over) return;

    const osId = active.id as string;
    const fromStatus = (active.data.current as { currentStatus: string } | undefined)?.currentStatus;
    const toStatus = over.id as string;

    if (!fromStatus || fromStatus === toStatus) return;

    const allowed = allowedTransitions[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      toast.error(`Transição inválida: "${statusLabels[fromStatus] ?? fromStatus}" → "${statusLabels[toStatus] ?? toStatus}"`);
      return;
    }

    const os = ordens.find((o) => o.id === osId);
    if (os) onMove(os, toStatus);
  }

  const prioridadeMeta: Record<string, { label: string; color: string }> = {
    '':      { label: 'Todas',   color: '' },
    critica: { label: 'Crítica', color: 'bg-red-500' },
    alta:    { label: 'Alta',    color: 'bg-orange-400' },
    media:   { label: 'Média',   color: 'bg-blue-400' },
    baixa:   { label: 'Baixa',   color: 'bg-gray-300' },
  };

  return (
    <>
      {/* Kanban filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-gray-400" />
        <div className="flex gap-1">
          {Object.entries(prioridadeMeta).map(([p, { label, color }]) => (
            <button
              key={p}
              onClick={() => setKanbanPrioridade(p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                kanbanPrioridade === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {color && <span className={`w-1.5 h-1.5 rounded-full ${color}`} />}
              {label}
            </button>
          ))}
        </div>
        <select
          value={kanbanCaminhao}
          onChange={(e) => setKanbanCaminhao(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none"
        >
          <option value="">Todos os caminhões</option>
          {caminhoes.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.placa}</option>)}
        </select>
        {(kanbanPrioridade || kanbanCaminhao || kanbanSoAtrasadas) && (
          <button
            onClick={() => { setKanbanPrioridade(''); setKanbanCaminhao(''); setKanbanSoAtrasadas(false); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar
          </button>
        )}
        {kanbanAtrasadas > 0 && (
          <button
            onClick={() => setKanbanSoAtrasadas((v) => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition ${
              kanbanSoAtrasadas ? 'bg-red-600 text-white border-red-600' : 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertCircle size={11} /> {kanbanAtrasadas} atrasada{kanbanAtrasadas !== 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={onRefetch}
          className="ml-1 flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="min-h-[200px]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              </div>
              <div className="space-y-2.5"><CardSkeleton /><CardSkeleton /></div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {kanbanColumns.map((col) => {
              const colOrdens = ordensKanban.filter((o) => o.status === col.status);
              const custoTotal = colOrdens.reduce((s, o) => s + (o.custoTotal ?? 0), 0);
              return (
                <DroppableKanbanColumn key={col.status} column={col} count={colOrdens.length} custoTotal={custoTotal}>
                  {colOrdens.length === 0 ? (
                    <EmptyState icon={ClipboardX} title="Nenhuma OS" compact />
                  ) : (
                    colOrdens.map((os) => (
                      <DraggableOSCard
                        key={os.id}
                        os={os}
                        atrasada={isAtrasada(os)}
                        onMove={onMove}
                        onFilterPrioridade={setKanbanPrioridade}
                      />
                    ))
                  )}
                </DroppableKanbanColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeOs ? <OSCardOverlay os={activeOs} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}
