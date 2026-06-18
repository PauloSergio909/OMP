export const tipoLabels: Record<string, string> = {
  equipamento: 'Equipamento',
  ferramenta: 'Ferramenta',
  veiculo_apoio: 'Veículo de Apoio',
};

export const statusColors: Record<string, string> = {
  disponivel: 'bg-green-500',
  em_uso: 'bg-blue-500',
  manutencao: 'bg-amber-500',
  descartado: 'bg-gray-400',
};

export const emptyForm = {
  nome: '', tipo: 'ferramenta', descricao: '', numeroSerie: '',
  localizacao: '', dataAquisicao: '', valorAquisicao: '',
  fabricante: '', modelo: '', proximaRevisao: '', observacoes: '',
};

export const emptyMov = {
  tipo: 'retirada', responsavelId: '', destino: '', observacoes: '', novoStatus: '',
};

export const emptyEdit = {
  nome: '', status: '', localizacao: '', proximaRevisao: '', observacoes: '',
};
