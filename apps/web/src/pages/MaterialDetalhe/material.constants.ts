export const tipoLabels: Record<string, string> = {
  entrada:   'Entrada',
  saida:     'Saída',
  ajuste:    'Ajuste',
  devolucao: 'Devolução',
};

export const tipoColors: Record<string, string> = {
  entrada:   'bg-green-50 text-green-700 border-green-200',
  saida:     'bg-red-50 text-red-700 border-red-200',
  ajuste:    'bg-blue-50 text-blue-700 border-blue-200',
  devolucao: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const unidades = ['litro', 'unidade', 'jogo', 'metro', 'kg', 'par'];

export const emptyEdit = {
  nome: '', categoriaId: '', unidadeMedida: 'unidade',
  precoUnitario: '', estoqueMinimo: '', estoqueMaximo: '', fornecedorId: '',
};
export const emptyEntrada = { quantidade: '', precoUnitario: '', motivo: '' };
export const emptySaida   = { quantidade: '', motivo: '' };
