import type { OrdemServicoListItem } from '../../hooks/useApi';

export const kanbanColumns = [
  { status: 'orcamento',       label: 'Orçamentos',   color: 'bg-gray-400' },
  { status: 'agendada',        label: 'Agendadas',    color: 'bg-blue-500' },
  { status: 'em_andamento',    label: 'Em Andamento', color: 'bg-amber-500' },
  { status: 'aguardando_peca', label: 'Aguard. Peça', color: 'bg-purple-500' },
  { status: 'concluida',       label: 'Concluídas',   color: 'bg-green-500' },
];

// Espelha os.service.ts no backend
export const allowedTransitions: Record<string, string[]> = {
  orcamento:       ['agendada', 'cancelada'],
  agendada:        ['em_andamento', 'cancelada'],
  em_andamento:    ['aguardando_peca', 'concluida', 'cancelada'],
  aguardando_peca: ['em_andamento', 'cancelada'],
  concluida:       [],
  cancelada:       [],
};

export const statusLabels: Record<string, string> = {
  aberta:          'Abertas',
  orcamento:       'Orçamento',
  agendada:        'Agendada',
  em_andamento:    'Em Andamento',
  aguardando_peca: 'Aguard. Peça',
  concluida:       'Concluída',
  cancelada:       'Cancelada',
};

export const prioridadeBorder: Record<string, string> = {
  critica: 'border-l-red-500',
  alta:    'border-l-orange-500',
  media:   'border-l-blue-400',
  baixa:   'border-l-gray-300',
};

export const prioridadeWeight: Record<string, number> = { critica: 4, alta: 3, media: 2, baixa: 1 };

export const emptyOS = {
  caminhaoId: '', tipo: 'preventiva', descricao: '',
  prioridade: 'media', responsavelId: '', dataPrevisao: '', observacoes: '',
  criarComoOrcamento: false,
};

export function isAtrasada(os: OrdemServicoListItem) {
  if (['concluida', 'cancelada', 'orcamento'].includes(os.status)) return false;
  return os.dataPrevisao ? new Date(os.dataPrevisao) < new Date() : false;
}
