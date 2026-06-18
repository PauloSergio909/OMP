export const statusFlow = [
  { value: 'orcamento',       label: 'Orçamento' },
  { value: 'agendada',        label: 'Agendada' },
  { value: 'em_andamento',    label: 'Em Andamento' },
  { value: 'aguardando_peca', label: 'Aguard. Peça' },
  { value: 'concluida',       label: 'Concluída' },
  { value: 'cancelada',       label: 'Cancelada' },
];

// Espelha a máquina de estados de os.service.ts
export const allowedTransitions: Record<string, string[]> = {
  orcamento:       ['agendada', 'cancelada'],
  agendada:        ['em_andamento', 'cancelada'],
  em_andamento:    ['aguardando_peca', 'concluida', 'cancelada'],
  aguardando_peca: ['em_andamento', 'cancelada'],
};

export const timelineSteps = [
  { value: 'agendada',        label: 'Agendada' },
  { value: 'em_andamento',    label: 'Em Andamento' },
  { value: 'aguardando_peca', label: 'Aguard. Peça' },
  { value: 'concluida',       label: 'Concluída' },
];
