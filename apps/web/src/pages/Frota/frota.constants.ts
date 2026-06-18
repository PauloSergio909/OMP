export const statusFilterOptions = ['todos', 'operacional', 'manutencao', 'parado'] as const;

export const statusFilterLabels: Record<string, string> = {
  todos: 'Todos', operacional: 'Operacionais', manutencao: 'Em Manutenção', parado: 'Parados',
};

export const statusBarColors: Record<string, string> = {
  operacional: 'bg-green-500', manutencao: 'bg-amber-500', parado: 'bg-red-500',
};

export function manutencaoInfo(proximaManutencao: string) {
  const dias = Math.ceil((new Date(proximaManutencao).getTime() - Date.now()) / 86400000);
  const cor = dias < 0 ? 'text-red-600 font-bold' : dias <= 7 ? 'text-red-500 font-medium' : dias <= 30 ? 'text-amber-600 font-medium' : 'text-gray-700';
  return { dias, cor };
}
