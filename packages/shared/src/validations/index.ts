import { z } from 'zod';

export function validarCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i);
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export function validarCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let sum = 0, pos = n - 7;
    for (let i = n; i >= 1; i--) { sum += parseInt(d[n - i]) * pos--; if (pos < 2) pos = 9; }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
}

const isoDateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use YYYY-MM-DD ou ISO 8601'));

const _materialBase = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório' })
    .trim()
    .min(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
    .max(200, { message: 'Nome deve ter no máximo 200 caracteres' }),

  categoriaId: z
    .string({ required_error: 'Categoria é obrigatória' })
    .uuid({ message: 'ID de categoria inválido' }),

  unidadeMedida: z.enum(['litro', 'unidade', 'jogo', 'metro', 'kg', 'par'], {
    errorMap: () => ({ message: 'Unidade de medida inválida' }),
  }),

  precoUnitario: z
    .number({ required_error: 'Preço é obrigatório' })
    .positive({ message: 'Preço deve ser maior que zero' })
    .max(9_999_999.99, 'Preço inválido'),

  estoqueMinimo: z
    .number()
    .int({ message: 'Estoque mínimo deve ser um número inteiro' })
    .nonnegative({ message: 'Estoque mínimo não pode ser negativo' })
    .max(1_000_000, 'Valor inválido'),

  estoqueMaximo: z
    .number()
    .int()
    .positive({ message: 'Estoque máximo deve ser maior que zero' })
    .max(1_000_000, 'Valor inválido'),

  fornecedorId: z
    .string({ required_error: 'Fornecedor é obrigatório' })
    .uuid({ message: 'ID de fornecedor inválido' }),
});

export const createMaterialSchema = _materialBase
  .refine((data) => data.estoqueMaximo > data.estoqueMinimo, {
    message: 'Estoque máximo deve ser maior que o mínimo',
    path: ['estoqueMaximo'],
  });

// updateMaterialSchema usa _materialBase.partial() para evitar que a refine do create
// falhe quando apenas alguns campos são enviados (ex: só nome ou só precoUnitario).
// ativo é adicionado via .extend() pois não faz parte do _materialBase (campo de status).
export const updateMaterialSchema = _materialBase.partial()
  .extend({ ativo: z.boolean().optional() })
  .refine(
    (data) => {
      if (data.estoqueMaximo !== undefined && data.estoqueMinimo !== undefined) {
        return data.estoqueMaximo > data.estoqueMinimo;
      }
      return true;
    },
    { message: 'Estoque máximo deve ser maior que o mínimo', path: ['estoqueMaximo'] },
  );

export const createMovimentacaoSchema = z.object({
  materialId: z.string().uuid(),

  tipo: z.enum(['entrada', 'saida', 'ajuste', 'devolucao'], {
    errorMap: () => ({ message: 'Tipo de movimentação inválido' }),
  }),

  quantidade: z
    .number()
    .int()
    .positive({ message: 'Quantidade deve ser maior que zero' }),

  precoUnitario: z.number().nonnegative(),

  motivo: z
    .string()
    .trim()
    .min(3, { message: 'Motivo deve ter pelo menos 3 caracteres' })
    .max(500),

  ordemServicoId: z.string().uuid().optional().nullable(),
});

export const createCaminhaoSchema = z.object({
  placa: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/, {
      message: 'Placa inválida. Use formato ABC-1234 ou ABC1D23',
    }),

  chassi: z
    .string()
    .length(17, { message: 'Chassi deve ter exatamente 17 caracteres' }),

  modelo: z.string().trim().min(2).max(100),
  fabricante: z.string().trim().min(2).max(100),

  anoFabricacao: z
    .number()
    .int()
    .min(1990, { message: 'Ano deve ser a partir de 1990' })
    .max(new Date().getFullYear() + 1, { message: 'Ano inválido' }),

  kmAtual: z.number().int().nonnegative(),
  motoristaId: z.string().uuid().optional().nullable(),
  proximaManutencao: isoDateSchema.optional().nullable(),
});

export const createOrdemServicoSchema = z.object({
  caminhaoId: z.string().uuid({ message: 'Selecione um caminhão' }),

  tipo: z.enum(['preventiva', 'corretiva'], {
    errorMap: () => ({ message: 'Tipo deve ser preventiva ou corretiva' }),
  }),

  descricao: z
    .string()
    .trim()
    .min(10, { message: 'Descrição deve ter pelo menos 10 caracteres' })
    .max(1000),

  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),

  responsavelId: z.string().uuid({ message: 'Selecione um responsável' }),

  dataPrevisao: z
    .string()
    .datetime({ message: 'Data de previsão inválida' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .refine((v) => new Date(v) >= new Date(new Date().toDateString()), {
      message: 'Data de previsão não pode ser no passado',
    }),

  observacoes: z.string().trim().max(2000).optional(),
  criarComoOrcamento: z.boolean().optional(),
});

export const updateOSStatusSchema = z.object({
  status: z.enum(['orcamento', 'agendada', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada']),
  observacoes: z.string().trim().optional(),
});

export const updateOrdemServicoSchema = z.object({
  descricao: z.string().trim().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(1000).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
  responsavelId: z.string().uuid('Responsável inválido').optional(),
  dataPrevisao: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email é obrigatório' })
    .trim()
    .toLowerCase()
    .email({ message: 'Email inválido' }),

  senha: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
});

export const registerSchema = loginSchema.extend({
  nome: z.string().trim().min(3).max(100),

  confirmarSenha: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'Senhas não conferem',
  path: ['confirmarSenha'],
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(20),
  search: z.string().optional(),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createFuncionarioSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  cpf: z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido').refine(validarCpf, 'CPF inválido'),
  cargo: z.enum(['motorista', 'mecanico', 'almoxarife', 'gerente', 'administrativo'], {
    errorMap: () => ({ message: 'Cargo inválido' }),
  }),
  cnhCategoria: z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']).optional(),
  cnhValidade: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  telefone: z.string().trim().min(10, 'Telefone inválido').max(20),
  email: z.string().trim().toLowerCase().email('Email inválido'),
});

export const updateFuncionarioSchema = createFuncionarioSchema.omit({ cpf: true }).partial().extend({
  cnhValidade: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  cnhCategoria: z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']).nullable().optional(),
});

export const updateFuncionarioStatusSchema = z.object({
  ativo: z.boolean(),
});

export const createAbastecimentoSchema = z.object({
  caminhaoId: z.string().uuid('Selecione um caminhão'),
  motoristaId: z.string().uuid('Selecione um motorista'),
  litros: z.number().positive('Litros deve ser maior que zero').max(10_000, 'Quantidade de litros inválida'),
  precoLitro: z.number().positive('Preço deve ser maior que zero').max(999.99, 'Preço por litro inválido'),
  kmAtual: z.number().int().nonnegative('KM atual não pode ser negativo').max(9_999_999, 'KM inválido'),
  combustivel: z.enum(['diesel', 'diesel_s10', 'arla32'], {
    errorMap: () => ({ message: 'Tipo de combustível inválido' }),
  }),
  posto: z.string().trim().min(2, 'Nome do posto inválido').max(200),
  data: isoDateSchema.optional(),
});

export const updateAbastecimentoSchema = z.object({
  litros: z.number().positive('Litros deve ser maior que zero').optional(),
  precoLitro: z.number().positive('Preço deve ser maior que zero').optional(),
  kmAtual: z.number().int().nonnegative().optional(),
  combustivel: z.enum(['diesel', 'diesel_s10', 'arla32']).optional(),
  posto: z.string().trim().min(2).max(200).optional(),
  motoristaId: z.string().uuid().optional(),
  data: isoDateSchema.optional(),
});

export type UpdateAbastecimentoInput = z.infer<typeof updateAbastecimentoSchema>;

export const createEquipamentoSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  tipo: z.enum(['equipamento', 'ferramenta', 'veiculo_apoio'], {
    errorMap: () => ({ message: 'Tipo inválido. Use: equipamento, ferramenta ou veiculo_apoio' }),
  }),
  descricao: z.string().trim().max(1000).optional(),
  numeroSerie: z.string().trim().max(100).optional(),
  responsavelId: z.string().uuid().optional(),
  localizacao: z.string().trim().max(200).optional(),
  dataAquisicao: isoDateSchema.optional(),
  valorAquisicao: z.number().nonnegative().optional(),
  fabricante: z.string().trim().max(100).optional(),
  modelo: z.string().trim().max(100).optional(),
  proximaRevisao: isoDateSchema.optional(),
  observacoes: z.string().trim().max(2000).optional(),
});

export const updateEquipamentoSchema = createEquipamentoSchema.partial().extend({
  status: z.enum(['disponivel', 'em_uso', 'manutencao', 'descartado']).optional(),
  ativo: z.boolean().optional(),
  responsavelId: z.string().uuid().optional().nullable(),
  proximaRevisao: isoDateSchema.optional().nullable(),
  localizacao: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});

export const createMovimentacaoEquipamentoSchema = z.object({
  tipo: z.enum(['retirada', 'devolucao', 'manutencao', 'descarte']),
  responsavelId: z.string().uuid('Selecione um responsável'),
  destino: z.string().trim().max(200).optional(),
  observacoes: z.string().trim().max(1000).optional(),
  novoStatus: z.enum(['disponivel', 'em_uso', 'manutencao', 'descartado']).optional(),
});

export const updateProfileSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

export const updatePasswordSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmarNovaSenha: z.string().min(6, 'Confirmação deve ter pelo menos 6 caracteres'),
}).refine((d) => d.novaSenha === d.confirmarNovaSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarNovaSenha'],
});

export const updateCaminhaoSchema = z.object({
  modelo: z.string().trim().min(2).max(100).optional(),
  fabricante: z.string().trim().min(2).max(100).optional(),
  kmAtual: z.number().int().nonnegative().optional(),
  motoristaId: z.string().uuid().optional().nullable(),
  proximaManutencao: isoDateSchema.optional().nullable(),
  proximaManutencaoKm: z.number().int().positive().optional().nullable(),
  vencimentoCrlv: isoDateSchema.optional().nullable(),
  vencimentoSeguro: isoDateSchema.optional().nullable(),
  numeroSeguro: z.string().trim().max(100).optional().nullable(),
  status: z.enum(['operacional', 'manutencao', 'parado']).optional(),
});

export const updateCaminhaoStatusSchema = z.object({
  status: z.enum(['operacional', 'manutencao', 'parado'], {
    errorMap: () => ({ message: 'Status inválido. Use: operacional, manutencao ou parado' }),
  }),
});

export const registrarKmSchema = z.object({
  km: z.number().int().positive('KM deve ser maior que zero'),
});

export const addOSItemSchema = z.object({
  materialId: z.string().uuid().optional(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  precoUnitario: z.number().nonnegative('Preço não pode ser negativo'),
  tipo: z.enum(['material', 'mao_de_obra', 'servico'], {
    errorMap: () => ({ message: 'Tipo inválido' }),
  }),
  descricao: z.string().trim().max(500).optional(),
});

export const createEntradaEstoqueSchema = z.object({
  materialId: z.string().uuid('Selecione um material'),
  quantidade: z.number().int().positive('Quantidade deve ser maior que zero'),
  precoUnitario: z.number().nonnegative('Preço não pode ser negativo'),
  motivo: z.string().trim().min(3, 'Motivo deve ter pelo menos 3 caracteres').max(500),
});

export const createSaidaEstoqueSchema = z.object({
  materialId: z.string().uuid('Selecione um material'),
  quantidade: z.number().int().positive('Quantidade deve ser maior que zero'),
  motivo: z.string().trim().min(3, 'Motivo deve ter pelo menos 3 caracteres').max(500),
  ordemServicoId: z.string().uuid().optional().nullable(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateMovimentacaoInput = z.infer<typeof createMovimentacaoSchema>;
export type CreateCaminhaoInput = z.infer<typeof createCaminhaoSchema>;
export type CreateOrdemServicoInput = z.infer<typeof createOrdemServicoSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateFuncionarioInput = z.infer<typeof createFuncionarioSchema>;
export type UpdateFuncionarioInput = z.infer<typeof updateFuncionarioSchema>;
export type UpdateFuncionarioStatusInput = z.infer<typeof updateFuncionarioStatusSchema>;
export type CreateAbastecimentoInput = z.infer<typeof createAbastecimentoSchema>;
export type CreateEquipamentoInput = z.infer<typeof createEquipamentoSchema>;
export type UpdateEquipamentoInput = z.infer<typeof updateEquipamentoSchema>;
export type CreateMovimentacaoEquipamentoInput = z.infer<typeof createMovimentacaoEquipamentoSchema>;
export type UpdateCaminhaoInput = z.infer<typeof updateCaminhaoSchema>;
export type UpdateCaminhaoStatusInput = z.infer<typeof updateCaminhaoStatusSchema>;
export type RegistrarKmInput = z.infer<typeof registrarKmSchema>;
export type AddOSItemInput = z.infer<typeof addOSItemSchema>;
export type UpdateOrdemServicoInput = z.infer<typeof updateOrdemServicoSchema>;
export type CreateEntradaEstoqueInput = z.infer<typeof createEntradaEstoqueSchema>;
export type CreateSaidaEstoqueInput = z.infer<typeof createSaidaEstoqueSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const createOrdemCompraSchema = z.object({
  fornecedorId: z.string().uuid('Selecione um fornecedor'),
  dataEntrega: isoDateSchema.optional(),
  observacoes: z.string().trim().max(2000).optional(),
  itens: z.array(z.object({
    materialId: z.string().uuid('Selecione o material'),
    quantidade: z.number().int().positive('Quantidade deve ser maior que zero').max(1_000_000, 'Quantidade inválida'),
    precoUnitario: z.number().nonnegative('Preço não pode ser negativo').max(9_999_999.99, 'Preço inválido'),
  })).min(1, 'Adicione pelo menos um item'),
}).superRefine((data, ctx) => {
  const ids = data.itens.map(i => i.materialId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', path: ['itens'], message: 'Não é permitido duplicar materiais na mesma ordem de compra' });
  }
});

export const updateOrdemCompraStatusSchema = z.object({
  status: z.enum(['pendente', 'aprovada', 'recebida', 'cancelada']),
});

export const updateOrdemCompraSchema = z.object({
  dataEntrega: isoDateSchema.optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateOrdemCompraInput = z.infer<typeof createOrdemCompraSchema>;
export type UpdateOrdemCompraStatusInput = z.infer<typeof updateOrdemCompraStatusSchema>;
export type UpdateOrdemCompraInput = z.infer<typeof updateOrdemCompraSchema>;

export const createFornecedorSchema = z.object({
  razaoSocial: z.string().trim().min(2, 'Razão social deve ter pelo menos 2 caracteres').max(200),
  cnpj: z.string().trim().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido').refine(validarCnpj, 'CNPJ inválido'),
  telefone: z.string().trim().min(10, 'Telefone inválido').max(20),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  endereco: z.string().trim().max(300).optional(),
});

export const updateFornecedorSchema = createFornecedorSchema.omit({ cnpj: true }).partial().extend({
  endereco: z.string().trim().max(300).optional().nullable(),
  avaliacao: z.number().min(0).max(5).optional(),
  ativo: z.boolean().optional(),
});

export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>;
export type UpdateFornecedorInput = z.infer<typeof updateFornecedorSchema>;

export const createCategoriaSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  descricao: z.string().trim().max(500).optional(),
});

export const updateCategoriaSchema = createCategoriaSchema.partial().extend({
  descricao: z.string().trim().max(500).optional().nullable(),
});

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;

export const createUserByAdminSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['admin', 'gerente', 'mecanico', 'almoxarife', 'visualizador']).default('visualizador'),
  funcionarioId: z.string().uuid().optional(),
});

export const updateAdminUserSchema = z.object({
  role: z.enum(['admin', 'gerente', 'mecanico', 'almoxarife', 'visualizador']).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
});

export type CreateUserByAdminInput = z.infer<typeof createUserByAdminSchema>;

export const updateEmpresaSchema = z.object({
  razaoSocial: z.string().trim().min(2, 'Razão social obrigatória').max(200),
  cnpj: z.string().trim().max(18).optional(),
  telefone: z.string().trim().max(20).optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido').optional().or(z.literal('')),
  endereco: z.string().trim().max(300).optional(),
  logoUrl: z.string().trim().url('URL inválida').optional().or(z.literal('')),
});

export type UpdateEmpresaInput = z.infer<typeof updateEmpresaSchema>;
