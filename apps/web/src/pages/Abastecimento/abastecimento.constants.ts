export const emptyForm = {
  caminhaoId: '', motoristaId: '', litros: '',
  precoLitro: '', kmAtual: '', combustivel: 'diesel', posto: '', data: '',
};

export const combustivelOptions = [
  { value: 'diesel',    label: 'Diesel' },
  { value: 'diesel_s10', label: 'Diesel S10' },
  { value: 'arla32',    label: 'Arla 32' },
] as const;
