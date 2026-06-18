export const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
};

export const statusColors: Record<string, string> = {
  pendente:  'bg-amber-50 text-amber-700 border-amber-200',
  aprovada:  'bg-blue-50 text-blue-700 border-blue-200',
  recebida:  'bg-green-50 text-green-700 border-green-200',
  cancelada: 'bg-red-50 text-red-700 border-red-200',
};

export const statusOptions = ['todos', 'pendente', 'aprovada', 'recebida', 'cancelada'] as const;
