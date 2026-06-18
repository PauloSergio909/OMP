export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const corClasses: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  gray:   'bg-gray-100 text-gray-700 border-gray-200',
};

export const emptyEventoForm = {
  titulo: '', descricao: '', data: '', tipo: 'lembrete', cor: 'blue', link: '',
};
