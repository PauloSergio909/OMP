import { Wrench, Package, Car } from 'lucide-react';

export const tipoLabels: Record<string, string> = {
  equipamento: 'Equipamento', ferramenta: 'Ferramenta', veiculo_apoio: 'Veículo de Apoio',
};

export const tipoIcons: Record<string, typeof Wrench> = {
  equipamento: Package, ferramenta: Wrench, veiculo_apoio: Car,
};

export const statusColors: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-700 border-green-200',
  em_uso:     'bg-blue-100 text-blue-700 border-blue-200',
  manutencao: 'bg-amber-100 text-amber-700 border-amber-200',
  descartado: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const movTipoLabels: Record<string, string> = {
  retirada: 'Retirada', devolucao: 'Devolução', manutencao: 'Manutenção', descarte: 'Descarte',
};

export const movTipoColors: Record<string, string> = {
  retirada:  'bg-blue-50 text-blue-700 border-blue-200',
  devolucao: 'bg-green-50 text-green-700 border-green-200',
  manutencao:'bg-amber-50 text-amber-700 border-amber-200',
  descarte:  'bg-red-50 text-red-700 border-red-200',
};

export const emptyEditForm = {
  nome: '', status: '', localizacao: '', proximaRevisao: '', observacoes: '', responsavelId: '',
};

export const emptyMovForm = {
  tipo: 'retirada', responsavelId: '', destino: '', observacoes: '', novoStatus: '',
};

export function revisaoStatus(data?: string | null): 'ok' | 'vencendo' | 'vencida' | null {
  if (!data) return null;
  const diff = (new Date(data).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencida';
  if (diff < 30) return 'vencendo';
  return 'ok';
}
