export type CaminhaoStatus = 'operacional' | 'manutencao' | 'parado';

export type EquipamentoTipo = 'equipamento' | 'ferramenta' | 'veiculo_apoio';

export type EquipamentoStatus = 'disponivel' | 'em_uso' | 'manutencao' | 'descartado';

export type MovimentacaoEquipamentoTipo = 'retirada' | 'devolucao' | 'manutencao' | 'descarte';

export type OSTipo = 'preventiva' | 'corretiva';

export type OSStatus = 'agendada' | 'em_andamento' | 'aguardando_peca' | 'concluida' | 'cancelada';

export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica';

export type MovimentacaoTipo = 'entrada' | 'saida' | 'ajuste' | 'devolucao';

export type UnidadeMedida = 'litro' | 'unidade' | 'jogo' | 'metro' | 'kg' | 'par';

export type UserRole = 'admin' | 'gerente' | 'mecanico' | 'almoxarife' | 'visualizador';

export interface Material {
  id: string;
  codigo: string;
  nome: string;
  categoriaId: string;
  unidadeMedida: UnidadeMedida;
  precoUnitario: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  fornecedorId: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMaterialDTO {
  nome: string;
  categoriaId: string;
  unidadeMedida: UnidadeMedida;
  precoUnitario: number;
  estoqueMinimo: number;
  estoqueMaximo: number;
  fornecedorId: string;
}

export interface UpdateMaterialDTO extends Partial<CreateMaterialDTO> {}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco?: string;
  avaliacao: number;
  ativo: boolean;
}

export interface Estoque {
  id: string;
  materialId: string;
  quantidade: number;
  localizacao?: string;
  ultimaAtualizacao: string;
}

export interface EstoqueComMaterial extends Estoque {
  material: Material;
  categoria: Categoria;
  fornecedor: Fornecedor;
}

export interface Movimentacao {
  id: string;
  materialId: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  precoUnitario: number;
  motivo: string;
  ordemServicoId?: string;
  usuarioId: string;
  createdAt: string;
}

export interface Caminhao {
  id: string;
  codigo: string;
  placa: string;
  chassi: string;
  modelo: string;
  fabricante: string;
  anoFabricacao: number;
  kmAtual: number;
  status: CaminhaoStatus;
  motoristaId?: string;
  proximaManutencao?: string;
  createdAt?: string;
}

export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  telefone: string;
  email: string;
  role: UserRole;
  ativo: boolean;
}

export interface OrdemServico {
  id: string;
  codigo: string;
  caminhaoId: string;
  tipo: OSTipo;
  descricao: string;
  status: OSStatus;
  prioridade: Prioridade;
  responsavelId: string;
  dataAbertura: string;
  dataPrevisao: string;
  dataConclusao?: string;
  custoTotal?: number;
  observacoes?: string;
}

export interface ItemOS {
  id: string;
  ordemServicoId: string;
  materialId?: string;
  quantidade: number;
  precoUnitario: number;
  tipo: 'material' | 'mao_de_obra';
}

export interface Abastecimento {
  id: string;
  caminhaoId: string;
  motoristaId: string;
  litros: number;
  precoLitro: number;
  kmAtual: number;
  combustivel: 'diesel' | 'diesel_s10' | 'arla32';
  posto: string;
  data: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  message: string;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardKPIs {
  totalMateriais: number;
  itensAbaixoMinimo: number;
  totalCaminhoes: number;
  caminhoesOperacionais: number;
  osAbertas: number;
  osUrgentes: number;
  custoMensal: number;
  custoVariacao: number;
}

export interface ConsumoMensal {
  mes: string;
  oleo: number;
  filtros: number;
  pneus: number;
  freios: number;
}

export interface ManutencaoMensal {
  mes: string;
  preventiva: number;
  corretiva: number;
}

export interface Alerta {
  id: string;
  tipo: 'estoque' | 'manutencao' | 'os' | 'vencimento';
  nivel: 'info' | 'alerta' | 'critico';
  mensagem: string;
  criadoEm: string;
  lido: boolean;
}

export interface Equipamento {
  id: string;
  codigo: string;
  nome: string;
  tipo: EquipamentoTipo;
  descricao?: string;
  numeroSerie?: string;
  status: EquipamentoStatus;
  responsavelId?: string;
  localizacao?: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  fabricante?: string;
  modelo?: string;
  proximaRevisao?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEquipamentoDTO {
  nome: string;
  tipo: EquipamentoTipo;
  descricao?: string;
  numeroSerie?: string;
  responsavelId?: string;
  localizacao?: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  fabricante?: string;
  modelo?: string;
  proximaRevisao?: string;
  observacoes?: string;
}

export interface MovimentacaoEquipamento {
  id: string;
  equipamentoId: string;
  tipo: MovimentacaoEquipamentoTipo;
  responsavelId: string;
  destino?: string;
  observacoes?: string;
  createdAt: string;
}

export interface CreateFuncionarioDTO {
  nome: string;
  cpf: string;
  cargo: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  telefone: string;
  email: string;
}

export interface CreateAbastecimentoDTO {
  caminhaoId: string;
  motoristaId: string;
  litros: number;
  precoLitro: number;
  kmAtual: number;
  combustivel: 'diesel' | 'diesel_s10' | 'arla32';
  posto: string;
  data?: string;
}
