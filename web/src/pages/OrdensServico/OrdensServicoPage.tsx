// ══════════════════════════════════════════════════════════════
// ORDENS DE SERVIÇO PAGE — Gestão de OS
// ══════════════════════════════════════════════════════════════
// Exibe as OS em colunas kanban (Agendada → Em Andamento → Concluída)
// com cards coloridos por prioridade.

import { useState } from 'react';
import {
  ClipboardList, Plus, Filter, Calendar,
  Truck, User, Clock, ChevronDown,
} from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { StatusBadge } from '../../components/ui/StatusBadge';

// ─── DADOS MOCKADOS ──────────────────────────────────────────
const ordens = [
  { id: '1', codigo: 'OS-2026-012', caminhao: 'CAM-001', caminhaoModelo: 'Volvo FH 540', tipo: 'preventiva', status: 'em_andamento', prioridade: 'alta', responsavel: 'Pedro Mecânico', descricao: 'Troca de óleo motor e filtros', previsao: '10/02/2026', custo: 1250 },
  { id: '2', codigo: 'OS-2026-011', caminhao: 'CAM-003', caminhaoModelo: 'Mercedes Actros', tipo: 'corretiva', status: 'aguardando_peca', prioridade: 'critica', responsavel: 'Pedro Mecânico', descricao: 'Substituição correia alternador — quebra em trânsito', previsao: '08/02/2026', custo: 850 },
  { id: '3', codigo: 'OS-2026-010', caminhao: 'CAM-002', caminhaoModelo: 'Scania R450', tipo: 'preventiva', status: 'agendada', prioridade: 'media', responsavel: 'Lucas Técnico', descricao: 'Revisão 100.000km — freios, suspensão, fluidos', previsao: '15/02/2026', custo: null },
  { id: '4', codigo: 'OS-2026-009', caminhao: 'CAM-005', caminhaoModelo: 'Scania R500', tipo: 'corretiva', status: 'concluida', prioridade: 'alta', responsavel: 'Pedro Mecânico', descricao: 'Reparo sistema elétrico — alternador', previsao: '05/02/2026', custo: 2100 },
  { id: '5', codigo: 'OS-2026-008', caminhao: 'CAM-004', caminhaoModelo: 'Volvo FH 460', tipo: 'preventiva', status: 'agendada', prioridade: 'baixa', responsavel: 'Lucas Técnico', descricao: 'Troca de pneus dianteiros', previsao: '20/02/2026', custo: null },
  { id: '6', codigo: 'OS-2026-007', caminhao: 'CAM-006', caminhaoModelo: 'DAF XF 530', tipo: 'preventiva', status: 'em_andamento', prioridade: 'media', responsavel: 'Pedro Mecânico', descricao: 'Revisão geral — 50.000km', previsao: '09/02/2026', custo: 3200 },
  { id: '7', codigo: 'OS-2026-006', caminhao: 'CAM-001', caminhaoModelo: 'Volvo FH 540', tipo: 'corretiva', status: 'concluida', prioridade: 'media', responsavel: 'Lucas Técnico', descricao: 'Reparo vazamento fluido arrefecimento', previsao: '01/02/2026', custo: 480 },
];

// Configuração das colunas kanban
const kanbanColumns = [
  { status: 'agendada', label: 'Agendadas', color: 'bg-blue-500', lightBg: 'bg-blue-50' },
  { status: 'em_andamento', label: 'Em Andamento', color: 'bg-amber-500', lightBg: 'bg-amber-50' },
  { status: 'aguardando_peca', label: 'Aguard. Peça', color: 'bg-purple-500', lightBg: 'bg-purple-50' },
  { status: 'concluida', label: 'Concluídas', color: 'bg-green-500', lightBg: 'bg-green-50' },
];

const prioridadeBorder: Record<string, string> = {
  critica: 'border-l-red-500',
  alta:    'border-l-orange-500',
  media:   'border-l-blue-400',
  baixa:   'border-l-gray-300',
};

export function OrdensServicoPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

  const totalAbertas = ordens.filter((o) => !['concluida', 'cancelada'].includes(o.status)).length;
  const urgentes = ordens.filter((o) => o.prioridade === 'critica' && o.status !== 'concluida').length;
  const custoTotal = ordens.reduce((sum, o) => sum + (o.custo || 0), 0);

  return (
    <div className="space-y-6">
      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="OS Abertas" value={totalAbertas} subtitle={`${urgentes} urgentes`} icon={ClipboardList} color="orange" />
        <KPICard title="Concluídas (mês)" value={ordens.filter((o) => o.status === 'concluida').length} subtitle="fevereiro 2026" icon={ClipboardList} color="green" />
        <KPICard title="Preventiva/Corretiva" value="71% / 29%" subtitle="meta: > 70% preventiva" icon={ClipboardList} color="blue" />
        <KPICard title="Custo Total" value={`R$ ${(custoTotal / 1000).toFixed(1)}k`} subtitle="materiais + mão de obra" icon={ClipboardList} color="purple" />
      </div>

      {/* ─── TOOLBAR ─── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'kanban' ? 'bg-fleet-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'lista' ? 'bg-fleet-primary text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Lista
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fleet-primary text-white text-sm font-medium hover:bg-fleet-secondary transition">
          <Plus size={15} /> Nova OS
        </button>
      </div>

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanColumns.map((col) => {
            const colOrdens = ordens.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="min-h-[200px]">
                {/* Header da coluna */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {colOrdens.length}
                  </span>
                </div>

                {/* Cards da coluna */}
                <div className="space-y-2.5">
                  {colOrdens.map((os) => (
                    <div
                      key={os.id}
                      className={`
                        bg-white rounded-xl border border-gray-100 p-4
                        border-l-[3px] ${prioridadeBorder[os.prioridade]}
                        hover:shadow-md transition-shadow cursor-pointer
                      `}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-fleet-primary">{os.codigo}</span>
                        <StatusBadge status={os.tipo} />
                      </div>

                      {/* Descrição */}
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2 leading-snug">
                        {os.descricao}
                      </p>

                      {/* Meta info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Truck size={12} className="text-gray-400" />
                          <span>{os.caminhao} • {os.caminhaoModelo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User size={12} className="text-gray-400" />
                          <span>{os.responsavel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{os.previsao}</span>
                          </div>
                          <StatusBadge status={os.prioridade} />
                        </div>
                      </div>

                      {/* Custo (se houver) */}
                      {os.custo && (
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Custo estimado</span>
                          <span className="text-sm font-bold text-gray-900">R$ {os.custo.toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Estado vazio */}
                  {colOrdens.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Nenhuma OS neste status
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Código', 'Caminhão', 'Descrição', 'Tipo', 'Status', 'Prioridade', 'Responsável', 'Previsão', 'Custo'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordens.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50/50 transition cursor-pointer">
                    <td className="px-4 py-3 text-sm font-mono font-bold text-fleet-primary">{os.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{os.caminhao}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{os.descricao}</td>
                    <td className="px-4 py-3"><StatusBadge status={os.tipo} /></td>
                    <td className="px-4 py-3"><StatusBadge status={os.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={os.prioridade} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{os.responsavel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{os.previsao}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {os.custo ? `R$ ${os.custo.toLocaleString('pt-BR')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
