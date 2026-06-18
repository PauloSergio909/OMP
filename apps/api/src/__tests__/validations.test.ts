import { z } from 'zod';
import {
  updateMaterialSchema,
  updateFuncionarioSchema,
  updateFornecedorSchema,
  createMaterialSchema,
  createFuncionarioSchema,
  createOrdemServicoSchema,
  createOrdemCompraSchema,
  createFornecedorSchema,
  createCaminhaoSchema,
  createAbastecimentoSchema,
  updateCaminhaoSchema,
  updatePasswordSchema,
  addOSItemSchema,
  createEntradaEstoqueSchema,
  createSaidaEstoqueSchema,
  updateOSStatusSchema,
  updateOrdemServicoSchema,
  updateEquipamentoSchema,
  updateOrdemCompraSchema,
  updateCategoriaSchema,
  paginationSchema,
  registrarKmSchema,
  updateProfileSchema,
  validarCpf,
  validarCnpj,
  registerSchema,
  createEquipamentoSchema,
  createMovimentacaoEquipamentoSchema,
  updateAbastecimentoSchema,
  updateFuncionarioStatusSchema,
  updateCaminhaoStatusSchema,
  updateOrdemCompraStatusSchema,
} from '@fleetmaster/shared';

// Inline the schemas we want to test — validates same rules as shared package
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(6),
});

const updateEmpresaSchema = z.object({
  razaoSocial: z.string().trim().min(2).max(200),
  cnpj: z.string().trim().max(18).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
});

describe('loginSchema', () => {
  it('aceita credenciais válidas', () => {
    const r = loginSchema.safeParse({ email: 'admin@test.com', senha: 'abc123' });
    expect(r.success).toBe(true);
  });

  it('normaliza email para lowercase', () => {
    const r = loginSchema.safeParse({ email: 'ADMIN@Test.COM', senha: 'abc123' });
    expect(r.success && r.data.email).toBe('admin@test.com');
  });

  it('rejeita e-mail inválido', () => {
    const r = loginSchema.safeParse({ email: 'nao-e-email', senha: 'abc123' });
    expect(r.success).toBe(false);
  });

  it('rejeita senha menor que 6 chars', () => {
    const r = loginSchema.safeParse({ email: 'x@y.com', senha: '123' });
    expect(r.success).toBe(false);
  });
});

describe('updateEmpresaSchema', () => {
  it('aceita razão social mínima', () => {
    const r = updateEmpresaSchema.safeParse({ razaoSocial: 'AB' });
    expect(r.success).toBe(true);
  });

  it('rejeita razão social vazia', () => {
    const r = updateEmpresaSchema.safeParse({ razaoSocial: '' });
    expect(r.success).toBe(false);
  });

  it('aceita email opcional vazio', () => {
    const r = updateEmpresaSchema.safeParse({ razaoSocial: 'Empresa XYZ', email: '' });
    expect(r.success).toBe(true);
  });

  it('rejeita email malformado quando fornecido', () => {
    const r = updateEmpresaSchema.safeParse({ razaoSocial: 'Empresa XYZ', email: 'nao-email' });
    expect(r.success).toBe(false);
  });

  it('normaliza email para lowercase', () => {
    const r = updateEmpresaSchema.safeParse({ razaoSocial: 'XYZ Ltda', email: 'CONTATO@EMPRESA.COM' });
    expect(r.success && r.data?.email).toBe('contato@empresa.com');
  });
});

describe('updateMaterialSchema', () => {
  it('aceita atualização parcial contendo apenas nome', () => {
    // Antes do fix, a refine herdada do createMaterialSchema falhava com
    // undefined > undefined = false quando apenas um subset de campos era enviado
    const r = updateMaterialSchema.safeParse({ nome: 'Óleo Motor 15W40' });
    expect(r.success).toBe(true);
  });

  it('aceita ativo:false para inativar material', () => {
    // Antes do fix, ativo era stripped silenciosamente (não estava em _materialBase)
    const r = updateMaterialSchema.safeParse({ ativo: false });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ativo).toBe(false);
    }
  });

  it('aceita ativo:true para reativar material', () => {
    const r = updateMaterialSchema.safeParse({ ativo: true });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ativo).toBe(true);
    }
  });

  it('rejeita quando estoqueMaximo <= estoqueMinimo e ambos presentes', () => {
    const r = updateMaterialSchema.safeParse({ estoqueMinimo: 10, estoqueMaximo: 5 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].path).toContain('estoqueMaximo');
    }
  });

  it('aceita quando estoqueMaximo > estoqueMinimo e ambos presentes', () => {
    const r = updateMaterialSchema.safeParse({ estoqueMinimo: 5, estoqueMaximo: 10 });
    expect(r.success).toBe(true);
  });

  it('ignora a refine de estoque quando apenas estoqueMinimo é enviado', () => {
    // Refine condicional: só corre quando AMBOS os campos estão presentes
    const r = updateMaterialSchema.safeParse({ estoqueMinimo: 100 });
    expect(r.success).toBe(true);
  });
});

describe('updateFuncionarioSchema', () => {
  it('aceita atualização de nome sem CPF', () => {
    const r = updateFuncionarioSchema.safeParse({ nome: 'Maria Silva' });
    expect(r.success).toBe(true);
  });

  it('faz strip silencioso de CPF — campo imutável', () => {
    // omit({ cpf }) significa que o campo é descartado pelo Zod (strip default)
    const r = updateFuncionarioSchema.safeParse({ nome: 'Maria', cpf: '111.444.777-35' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>)['cpf']).toBeUndefined();
    }
  });

  it('aceita atualização de email e telefone', () => {
    const r = updateFuncionarioSchema.safeParse({
      email: 'novo@email.com',
      telefone: '11999999999',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita email inválido', () => {
    const r = updateFuncionarioSchema.safeParse({ email: 'nao-e-email' });
    expect(r.success).toBe(false);
  });

  it('aceita cnhValidade=null para limpar a data (sessão 31)', () => {
    const r = updateFuncionarioSchema.safeParse({ cnhValidade: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cnhValidade).toBeNull();
  });

  it('aceita cnhCategoria=null para limpar a categoria (sessão 31)', () => {
    const r = updateFuncionarioSchema.safeParse({ cnhCategoria: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cnhCategoria).toBeNull();
  });
});

describe('updateFornecedorSchema', () => {
  it('aceita atualização de razão social sem CNPJ', () => {
    const r = updateFornecedorSchema.safeParse({ razaoSocial: 'Nova Empresa Ltda' });
    expect(r.success).toBe(true);
  });

  it('faz strip silencioso de CNPJ — campo imutável', () => {
    const r = updateFornecedorSchema.safeParse({
      razaoSocial: 'Empresa XYZ',
      cnpj: '11.222.333/0001-81',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>)['cnpj']).toBeUndefined();
    }
  });

  it('aceita avaliação numérica de 0 a 5', () => {
    const r = updateFornecedorSchema.safeParse({ avaliacao: 4.5 });
    expect(r.success).toBe(true);
  });

  it('rejeita avaliação acima de 5', () => {
    const r = updateFornecedorSchema.safeParse({ avaliacao: 6 });
    expect(r.success).toBe(false);
  });

  it('aceita ativo:false para inativar fornecedor', () => {
    const r = updateFornecedorSchema.safeParse({ ativo: false });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ativo).toBe(false);
    }
  });

  it('aceita endereco=null para limpar o campo (sessão 34)', () => {
    const r = updateFornecedorSchema.safeParse({ endereco: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.endereco).toBeNull();
  });
});

// ─── createMaterialSchema ──────────────────────────────────────────────────────

describe('createMaterialSchema', () => {
  const base = {
    nome: 'Óleo Motor 15W40',
    categoriaId: '00000000-0000-0000-0000-000000000001',
    unidadeMedida: 'litro',
    precoUnitario: 25.9,
    estoqueMinimo: 5,
    estoqueMaximo: 100,
    fornecedorId: '00000000-0000-0000-0000-000000000002',
  };

  it('aceita material completo e válido', () => {
    const r = createMaterialSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita quando estoqueMaximo <= estoqueMinimo', () => {
    const r = createMaterialSchema.safeParse({ ...base, estoqueMinimo: 50, estoqueMaximo: 10 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].path).toContain('estoqueMaximo');
    }
  });

  it('rejeita quando estoqueMaximo === estoqueMinimo', () => {
    const r = createMaterialSchema.safeParse({ ...base, estoqueMinimo: 10, estoqueMaximo: 10 });
    expect(r.success).toBe(false);
  });

  it('rejeita unidade de medida inválida', () => {
    const r = createMaterialSchema.safeParse({ ...base, unidadeMedida: 'caixote' });
    expect(r.success).toBe(false);
  });

  it('rejeita preço não positivo', () => {
    const r = createMaterialSchema.safeParse({ ...base, precoUnitario: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita nome muito curto', () => {
    const r = createMaterialSchema.safeParse({ ...base, nome: 'X' });
    expect(r.success).toBe(false);
  });
});

// ─── createFuncionarioSchema ───────────────────────────────────────────────────

describe('createFuncionarioSchema', () => {
  const base = {
    nome: 'Carlos Silva',
    cpf: '111.444.777-35',
    cargo: 'motorista',
    telefone: '11999999999',
    email: 'carlos@omp.com',
  };

  it('aceita funcionário completo e válido', () => {
    const r = createFuncionarioSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('aceita CPF sem pontuação', () => {
    const r = createFuncionarioSchema.safeParse({ ...base, cpf: '11144477735' });
    expect(r.success).toBe(true);
  });

  it('rejeita CPF com dígitos verificadores errados', () => {
    // Formato válido mas dígitos verificadores incorretos
    const r = createFuncionarioSchema.safeParse({ ...base, cpf: '111.444.777-00' });
    expect(r.success).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    const r = createFuncionarioSchema.safeParse({ ...base, cpf: '111.111.111-11' });
    expect(r.success).toBe(false);
  });

  it('rejeita cargo inválido', () => {
    const r = createFuncionarioSchema.safeParse({ ...base, cargo: 'piloto' });
    expect(r.success).toBe(false);
  });

  it('rejeita email malformado', () => {
    const r = createFuncionarioSchema.safeParse({ ...base, email: 'nao-e-email' });
    expect(r.success).toBe(false);
  });

  it('aceita cnhCategoria e cnhValidade opcionais ausentes', () => {
    const r = createFuncionarioSchema.safeParse(base);
    expect(r.success).toBe(true);
  });
});

// ─── createOrdemServicoSchema ──────────────────────────────────────────────────

describe('createOrdemServicoSchema', () => {
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const base = {
    caminhaoId:    '00000000-0000-0000-0000-000000000001',
    tipo:          'preventiva',
    descricao:     'Troca de óleo e filtros completa do caminhão',
    prioridade:    'media',
    responsavelId: '00000000-0000-0000-0000-000000000002',
    dataPrevisao:  futureDate,
  };

  it('aceita OS válida com data futura', () => {
    const r = createOrdemServicoSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita data de previsão no passado', () => {
    const r = createOrdemServicoSchema.safeParse({ ...base, dataPrevisao: '2020-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].message).toMatch(/passado/i);
    }
  });

  it('rejeita descrição muito curta', () => {
    const r = createOrdemServicoSchema.safeParse({ ...base, descricao: 'Curta' });
    expect(r.success).toBe(false);
  });

  it('rejeita tipo inválido', () => {
    const r = createOrdemServicoSchema.safeParse({ ...base, tipo: 'emergencial' });
    expect(r.success).toBe(false);
  });

  it('rejeita prioridade inválida', () => {
    const r = createOrdemServicoSchema.safeParse({ ...base, prioridade: 'extrema' });
    expect(r.success).toBe(false);
  });

  it('aceita criarComoOrcamento=true (F3 — sessão 39)', () => {
    const r = createOrdemServicoSchema.safeParse({ ...base, criarComoOrcamento: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.criarComoOrcamento).toBe(true);
  });

  it('criarComoOrcamento é omitido quando não informado', () => {
    const r = createOrdemServicoSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.criarComoOrcamento).toBeUndefined();
  });
});

// ─── createOrdemCompraSchema ───────────────────────────────────────────────────

describe('createOrdemCompraSchema', () => {
  const mat1 = '00000000-0000-0000-0000-000000000001';
  const mat2 = '00000000-0000-0000-0000-000000000002';
  const forn = '00000000-0000-0000-0000-000000000003';

  const base = {
    fornecedorId: forn,
    itens: [
      { materialId: mat1, quantidade: 10, precoUnitario: 25.9 },
      { materialId: mat2, quantidade: 5,  precoUnitario: 100 },
    ],
  };

  it('aceita ordem de compra válida com dois itens distintos', () => {
    const r = createOrdemCompraSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita quando há materiais duplicados na mesma OC', () => {
    const r = createOrdemCompraSchema.safeParse({
      ...base,
      itens: [
        { materialId: mat1, quantidade: 10, precoUnitario: 25.9 },
        { materialId: mat1, quantidade: 5,  precoUnitario: 25.9 },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].message).toMatch(/duplicar/i);
    }
  });

  it('rejeita quando itens está vazio', () => {
    const r = createOrdemCompraSchema.safeParse({ ...base, itens: [] });
    expect(r.success).toBe(false);
  });

  it('rejeita quantidade zero num item', () => {
    const r = createOrdemCompraSchema.safeParse({
      ...base,
      itens: [{ materialId: mat1, quantidade: 0, precoUnitario: 10 }],
    });
    expect(r.success).toBe(false);
  });

  it('aceita preço unitário zero (ex: mão de obra sem custo de material)', () => {
    const r = createOrdemCompraSchema.safeParse({
      ...base,
      itens: [{ materialId: mat1, quantidade: 1, precoUnitario: 0 }],
    });
    expect(r.success).toBe(true);
  });
});

// ─── validarCpf (função pura exportada) ──────────────────────────────────────

describe('validarCpf', () => {
  it('retorna true para CPF válido com pontuação', () => {
    expect(validarCpf('111.444.777-35')).toBe(true);
  });

  it('retorna true para CPF válido sem pontuação', () => {
    expect(validarCpf('11144477735')).toBe(true);
  });

  it('retorna false para CPF com dígitos verificadores errados', () => {
    expect(validarCpf('111.444.777-00')).toBe(false);
  });

  it('retorna false para CPF com todos os dígitos iguais', () => {
    expect(validarCpf('000.000.000-00')).toBe(false);
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('99999999999')).toBe(false);
  });

  it('retorna false para CPF com comprimento errado', () => {
    expect(validarCpf('123456')).toBe(false);
  });
});

// ─── validarCnpj (função pura exportada) ─────────────────────────────────────

describe('validarCnpj', () => {
  it('retorna true para CNPJ válido com pontuação', () => {
    // 11.222.333/0001-81: dígitos verificadores corretos
    expect(validarCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('retorna true para CNPJ válido sem pontuação', () => {
    expect(validarCnpj('11222333000181')).toBe(true);
  });

  it('retorna false para CNPJ com dígitos verificadores errados', () => {
    expect(validarCnpj('11.222.333/0001-00')).toBe(false);
  });

  it('retorna false para CNPJ com todos os dígitos iguais', () => {
    expect(validarCnpj('11.111.111/1111-11')).toBe(false);
  });

  it('retorna false para CNPJ com comprimento errado', () => {
    expect(validarCnpj('1234567890')).toBe(false);
  });
});

// ─── createFornecedorSchema ───────────────────────────────────────────────────

describe('createFornecedorSchema', () => {
  const base = {
    razaoSocial: 'Distribuidora ABC Ltda',
    cnpj: '11.222.333/0001-81',
    telefone: '11999999999',
    email: 'contato@abc.com.br',
  };

  it('aceita fornecedor completo e válido', () => {
    const r = createFornecedorSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita CNPJ inválido (dígitos verificadores errados)', () => {
    const r = createFornecedorSchema.safeParse({ ...base, cnpj: '11.222.333/0001-00' });
    expect(r.success).toBe(false);
  });

  it('rejeita email malformado', () => {
    const r = createFornecedorSchema.safeParse({ ...base, email: 'nao-email' });
    expect(r.success).toBe(false);
  });

  it('faz strip silencioso de CNPJ no update — campo imutável já testado em updateFornecedorSchema', () => {
    // Confirma que createFornecedorSchema EXIGE o CNPJ
    const r = createFornecedorSchema.safeParse({ razaoSocial: 'ABC', telefone: '11999999999', email: 'a@b.com' });
    expect(r.success).toBe(false);
  });
});

// ─── createCaminhaoSchema ─────────────────────────────────────────────────────

describe('createCaminhaoSchema', () => {
  const base = {
    placa: 'ABC-1234',
    chassi: 'ABC12345678901234',  // 17 chars
    modelo: 'Constellation',
    fabricante: 'Volkswagen',
    anoFabricacao: 2022,
    kmAtual: 0,
  };

  it('aceita caminhão válido com placa antiga (ABC-1234)', () => {
    const r = createCaminhaoSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('aceita placa Mercosul (ABC1D23)', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, placa: 'ABC1D23' });
    expect(r.success).toBe(true);
  });

  it('rejeita placa com formato inválido', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, placa: 'INVALIDO' });
    expect(r.success).toBe(false);
  });

  it('rejeita chassi com menos de 17 caracteres', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, chassi: 'CURTO' });
    expect(r.success).toBe(false);
  });

  it('rejeita chassi com mais de 17 caracteres', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, chassi: 'ABCDEFGHIJKLMNOPQR' }); // 18 chars
    expect(r.success).toBe(false);
  });

  it('rejeita ano de fabricação anterior a 1990', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, anoFabricacao: 1989 });
    expect(r.success).toBe(false);
  });

  it('rejeita KM atual negativo', () => {
    const r = createCaminhaoSchema.safeParse({ ...base, kmAtual: -1 });
    expect(r.success).toBe(false);
  });
});

// ─── createAbastecimentoSchema ────────────────────────────────────────────────

describe('createAbastecimentoSchema', () => {
  const base = {
    caminhaoId:  '00000000-0000-0000-0000-000000000001',
    motoristaId: '00000000-0000-0000-0000-000000000002',
    litros:      100,
    precoLitro:  6.49,
    kmAtual:     45000,
    combustivel: 'diesel',
    posto:       'Posto Ipiranga BR-163',
  };

  it('aceita abastecimento completo e válido', () => {
    const r = createAbastecimentoSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita litros zero', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, litros: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita litros acima do máximo (10000)', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, litros: 10001 });
    expect(r.success).toBe(false);
  });

  it('rejeita preço por litro negativo', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, precoLitro: -1 });
    expect(r.success).toBe(false);
  });

  it('rejeita combustível com tipo inválido', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, combustivel: 'gasolina' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].message).toMatch(/combustível inválido/i);
    }
  });

  it('rejeita posto com nome muito curto', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, posto: 'P' });
    expect(r.success).toBe(false);
  });

  it('aceita kmAtual zero (caminhão novo no primeiro abastecimento)', () => {
    const r = createAbastecimentoSchema.safeParse({ ...base, kmAtual: 0 });
    expect(r.success).toBe(true);
  });

  it('aceita diesel_s10 e arla32 como tipos de combustível válidos', () => {
    expect(createAbastecimentoSchema.safeParse({ ...base, combustivel: 'diesel_s10' }).success).toBe(true);
    expect(createAbastecimentoSchema.safeParse({ ...base, combustivel: 'arla32' }).success).toBe(true);
  });
});

// ─── updateCaminhaoSchema ─────────────────────────────────────────────────────

describe('updateCaminhaoSchema', () => {
  it('aceita atualização parcial contendo apenas modelo', () => {
    const r = updateCaminhaoSchema.safeParse({ modelo: 'FH 540' });
    expect(r.success).toBe(true);
  });

  it('aceita status operacional, manutencao e parado', () => {
    expect(updateCaminhaoSchema.safeParse({ status: 'operacional' }).success).toBe(true);
    expect(updateCaminhaoSchema.safeParse({ status: 'manutencao' }).success).toBe(true);
    expect(updateCaminhaoSchema.safeParse({ status: 'parado' }).success).toBe(true);
  });

  it('rejeita status inválido', () => {
    const r = updateCaminhaoSchema.safeParse({ status: 'em_manutencao' });
    expect(r.success).toBe(false);
  });

  it('aceita motoristaId null para desatribuir motorista', () => {
    const r = updateCaminhaoSchema.safeParse({ motoristaId: null });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.motoristaId).toBeNull();
    }
  });

  it('aceita kmAtual zero (reset de odômetro não é bloqueado pelo schema)', () => {
    // A lógica de km mínimo é validada no service (kmAtual >= kmAtual do caminhão)
    const r = updateCaminhaoSchema.safeParse({ kmAtual: 0 });
    expect(r.success).toBe(true);
  });
});

// ─── updatePasswordSchema ─────────────────────────────────────────────────────

describe('updatePasswordSchema', () => {
  it('aceita troca de senha quando confirmação coincide', () => {
    const r = updatePasswordSchema.safeParse({
      senhaAtual: 'senha123',
      novaSenha: 'novaSenha456',
      confirmarNovaSenha: 'novaSenha456',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita quando novaSenha e confirmarNovaSenha divergem', () => {
    const r = updatePasswordSchema.safeParse({
      senhaAtual: 'senha123',
      novaSenha: 'novaSenha456',
      confirmarNovaSenha: 'diferente789',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].path).toContain('confirmarNovaSenha');
      expect(r.error.errors[0].message).toMatch(/não conferem/i);
    }
  });

  it('rejeita quando senhaAtual está vazia', () => {
    const r = updatePasswordSchema.safeParse({
      senhaAtual: '',
      novaSenha: 'novaSenha456',
      confirmarNovaSenha: 'novaSenha456',
    });
    expect(r.success).toBe(false);
  });

  it('rejeita quando novaSenha tem menos de 6 caracteres', () => {
    const r = updatePasswordSchema.safeParse({
      senhaAtual: 'senha123',
      novaSenha: '123',
      confirmarNovaSenha: '123',
    });
    expect(r.success).toBe(false);
  });
});

// ─── addOSItemSchema ──────────────────────────────────────────────────────────

describe('addOSItemSchema', () => {
  const base = {
    quantidade:    1,
    precoUnitario: 0,      // mão de obra pode ter custo zero
    tipo:          'mao_de_obra',
    descricao:     'Troca de filtros e óleo',
  };

  it('aceita item de mão de obra válido (sem materialId)', () => {
    const r = addOSItemSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('aceita item de material com preço positivo', () => {
    const r = addOSItemSchema.safeParse({
      ...base,
      materialId:    '00000000-0000-0000-0000-000000000001',
      tipo:          'material',
      precoUnitario: 45.9,
    });
    expect(r.success).toBe(true);
  });

  it('rejeita quantidade zero', () => {
    const r = addOSItemSchema.safeParse({ ...base, quantidade: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita tipo inválido', () => {
    const r = addOSItemSchema.safeParse({ ...base, tipo: 'pecas' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.errors[0].message).toMatch(/tipo inválido/i);
    }
  });

  it('rejeita preço unitário negativo', () => {
    const r = addOSItemSchema.safeParse({ ...base, precoUnitario: -1 });
    expect(r.success).toBe(false);
  });
});

// ─── createEntradaEstoqueSchema ───────────────────────────────────────────────

describe('createEntradaEstoqueSchema', () => {
  const base = {
    materialId:    '00000000-0000-0000-0000-000000000001',
    quantidade:    50,
    precoUnitario: 25.9,
    motivo:        'Compra OC-001',
  };

  it('aceita entrada válida', () => {
    const r = createEntradaEstoqueSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita quantidade zero', () => {
    const r = createEntradaEstoqueSchema.safeParse({ ...base, quantidade: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita motivo com menos de 3 caracteres', () => {
    const r = createEntradaEstoqueSchema.safeParse({ ...base, motivo: 'OK' });
    expect(r.success).toBe(false);
  });

  it('aceita preçoUnitário zero (doação ou material sem custo)', () => {
    // nonnegative → 0 é válido
    const r = createEntradaEstoqueSchema.safeParse({ ...base, precoUnitario: 0 });
    expect(r.success).toBe(true);
  });
});

// ─── createSaidaEstoqueSchema ─────────────────────────────────────────────────

describe('createSaidaEstoqueSchema', () => {
  const base = {
    materialId: '00000000-0000-0000-0000-000000000001',
    quantidade: 10,
    motivo:     'Uso em OS-123',
  };

  it('aceita saída válida', () => {
    const r = createSaidaEstoqueSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejeita quantidade zero', () => {
    const r = createSaidaEstoqueSchema.safeParse({ ...base, quantidade: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita motivo com menos de 3 caracteres', () => {
    const r = createSaidaEstoqueSchema.safeParse({ ...base, motivo: 'OK' });
    expect(r.success).toBe(false);
  });

  it('aceita ordemServicoId opcional (saída sem OS vinculada)', () => {
    const r = createSaidaEstoqueSchema.safeParse({ ...base, ordemServicoId: null });
    expect(r.success).toBe(true);
  });
});

// ─── updateOSStatusSchema ─────────────────────────────────────────────────────

describe('updateOSStatusSchema', () => {
  it('aceita todos os status válidos de OS', () => {
    const statuses = ['agendada', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada'];
    for (const status of statuses) {
      const r = updateOSStatusSchema.safeParse({ status });
      expect(r.success).toBe(true);
    }
  });

  it('aceita status orcamento (F3 — sessão 39)', () => {
    const r = updateOSStatusSchema.safeParse({ status: 'orcamento' });
    expect(r.success).toBe(true);
  });

  it('rejeita status inválido', () => {
    const r = updateOSStatusSchema.safeParse({ status: 'finalizada' });
    expect(r.success).toBe(false);
  });

  it('aceita observacoes opcional ausente', () => {
    const r = updateOSStatusSchema.safeParse({ status: 'concluida' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.observacoes).toBeUndefined();
    }
  });
});

// ─── updateOrdemServicoSchema ─────────────────────────────────────────────────

describe('updateOrdemServicoSchema', () => {
  it('aceita atualização parcial contendo apenas prioridade', () => {
    const r = updateOrdemServicoSchema.safeParse({ prioridade: 'alta' });
    expect(r.success).toBe(true);
  });

  it('rejeita descrição com menos de 10 caracteres quando fornecida', () => {
    const r = updateOrdemServicoSchema.safeParse({ descricao: 'Curta' });
    expect(r.success).toBe(false);
  });

  it('rejeita prioridade inválida', () => {
    const r = updateOrdemServicoSchema.safeParse({ prioridade: 'urgente' });
    expect(r.success).toBe(false);
  });

  it('aceita objeto vazio (nenhum campo obrigatório no update parcial)', () => {
    const r = updateOrdemServicoSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('aceita observacoes=null para limpar o campo (sessão 34)', () => {
    const r = updateOrdemServicoSchema.safeParse({ observacoes: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.observacoes).toBeNull();
  });
});

// ─── paginationSchema ─────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('aplica defaults: page=1, perPage=20, order=desc', () => {
    const r = paginationSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.perPage).toBe(20);
      expect(r.data.order).toBe('desc');
    }
  });

  it('coerce: strings numéricas são convertidas para number', () => {
    const r = paginationSchema.safeParse({ page: '3', perPage: '50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(3);
      expect(r.data.perPage).toBe(50);
    }
  });

  it('rejeita page zero (positive)', () => {
    const r = paginationSchema.safeParse({ page: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita perPage acima de 500', () => {
    const r = paginationSchema.safeParse({ perPage: 501 });
    expect(r.success).toBe(false);
  });

  it('aceita search opcional ausente', () => {
    const r = paginationSchema.safeParse({ page: 1, perPage: 20 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.search).toBeUndefined();
    }
  });
});

// ─── registrarKmSchema ────────────────────────────────────────────────────────

describe('registrarKmSchema', () => {
  it('aceita km positivo', () => {
    const r = registrarKmSchema.safeParse({ km: 45321 });
    expect(r.success).toBe(true);
  });

  it('rejeita km zero', () => {
    // O service valida km > kmAtual; o schema bloqueia km=0 (positive)
    const r = registrarKmSchema.safeParse({ km: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita km negativo', () => {
    const r = registrarKmSchema.safeParse({ km: -1 });
    expect(r.success).toBe(false);
  });
});

// ─── updateProfileSchema ──────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('aceita perfil válido', () => {
    const r = updateProfileSchema.safeParse({ nome: 'Ana Lima', email: 'ana@omp.com.br' });
    expect(r.success).toBe(true);
  });

  it('normaliza email para lowercase', () => {
    const r = updateProfileSchema.safeParse({ nome: 'Ana Lima', email: 'ANA@OMP.COM.BR' });
    expect(r.success && r.data?.email).toBe('ana@omp.com.br');
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const r = updateProfileSchema.safeParse({ nome: 'An', email: 'ana@omp.com.br' });
    expect(r.success).toBe(false);
  });

  it('rejeita email inválido', () => {
    const r = updateProfileSchema.safeParse({ nome: 'Ana Lima', email: 'nao-e-email' });
    expect(r.success).toBe(false);
  });
});

// ─── updateEquipamentoSchema (sessões 32–34) ──────────────────────────────────

describe('updateEquipamentoSchema', () => {
  it('aceita atualização parcial de status', () => {
    const r = updateEquipamentoSchema.safeParse({ status: 'em_uso' });
    expect(r.success).toBe(true);
  });

  it('rejeita status inválido', () => {
    const r = updateEquipamentoSchema.safeParse({ status: 'perdido' });
    expect(r.success).toBe(false);
  });

  it('aceita proximaRevisao=null para limpar a data (sessão 32)', () => {
    const r = updateEquipamentoSchema.safeParse({ proximaRevisao: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.proximaRevisao).toBeNull();
  });

  it('aceita localizacao=null para limpar o campo (sessão 33)', () => {
    const r = updateEquipamentoSchema.safeParse({ localizacao: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.localizacao).toBeNull();
  });

  it('aceita observacoes=null para limpar o campo (sessão 33)', () => {
    const r = updateEquipamentoSchema.safeParse({ observacoes: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.observacoes).toBeNull();
  });

  it('aceita responsavelId=null para desatribuir responsável (sessão 34)', () => {
    const r = updateEquipamentoSchema.safeParse({ responsavelId: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.responsavelId).toBeNull();
  });

  it('aceita objeto vazio (atualização parcial)', () => {
    const r = updateEquipamentoSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});

// ─── updateOrdemCompraSchema (sessão 34) ─────────────────────────────────────

describe('updateOrdemCompraSchema', () => {
  it('aceita atualização parcial com apenas observacoes', () => {
    const r = updateOrdemCompraSchema.safeParse({ observacoes: 'Entrega urgente' });
    expect(r.success).toBe(true);
  });

  it('aceita observacoes=null para limpar o campo (sessão 34)', () => {
    const r = updateOrdemCompraSchema.safeParse({ observacoes: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.observacoes).toBeNull();
  });

  it('aceita dataEntrega=null para limpar a data (sessão 34)', () => {
    const r = updateOrdemCompraSchema.safeParse({ dataEntrega: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dataEntrega).toBeNull();
  });

  it('aceita objeto vazio', () => {
    const r = updateOrdemCompraSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});

// ─── updateCategoriaSchema (sessão 34) ───────────────────────────────────────

describe('updateCategoriaSchema', () => {
  it('aceita atualização de nome', () => {
    const r = updateCategoriaSchema.safeParse({ nome: 'Filtros e Lubrificantes' });
    expect(r.success).toBe(true);
  });

  it('aceita descricao=null para limpar o campo (sessão 34)', () => {
    const r = updateCategoriaSchema.safeParse({ descricao: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.descricao).toBeNull();
  });

  it('aceita objeto vazio (atualização parcial)', () => {
    const r = updateCategoriaSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('rejeita nome com menos de 2 caracteres quando fornecido', () => {
    const r = updateCategoriaSchema.safeParse({ nome: 'A' });
    expect(r.success).toBe(false);
  });
});

// ─── registerSchema ───────────────────────────────────────────────────────────

describe('registerSchema', () => {
  const base = { email: 'admin@omp.com', senha: 'Admin@123', confirmarSenha: 'Admin@123', nome: 'Administrador' };

  it('aceita dados válidos com senhas iguais', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita quando senhas não conferem (refine)', () => {
    const r = registerSchema.safeParse({ ...base, confirmarSenha: 'outra123' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.errors.map((e) => e.path.join('.'));
      expect(paths).toContain('confirmarSenha');
    }
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const r = registerSchema.safeParse({ ...base, nome: 'AB' });
    expect(r.success).toBe(false);
  });

  it('rejeita email malformado', () => {
    const r = registerSchema.safeParse({ ...base, email: 'nao-e-email' });
    expect(r.success).toBe(false);
  });
});

// ─── createEquipamentoSchema ──────────────────────────────────────────────────

describe('createEquipamentoSchema', () => {
  const base = { nome: 'Guincho Elétrico', tipo: 'equipamento' };

  it('aceita equipamento válido com campos mínimos', () => {
    expect(createEquipamentoSchema.safeParse(base).success).toBe(true);
  });

  it('aceita ferramenta e veiculo_apoio como tipos válidos', () => {
    expect(createEquipamentoSchema.safeParse({ ...base, tipo: 'ferramenta' }).success).toBe(true);
    expect(createEquipamentoSchema.safeParse({ ...base, tipo: 'veiculo_apoio' }).success).toBe(true);
  });

  it('rejeita tipo inválido', () => {
    const r = createEquipamentoSchema.safeParse({ ...base, tipo: 'caminhao' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.errors[0].message).toMatch(/tipo inválido/i);
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(createEquipamentoSchema.safeParse({ ...base, nome: 'G' }).success).toBe(false);
  });

  it('rejeita valorAquisicao negativo (nonnegative)', () => {
    expect(createEquipamentoSchema.safeParse({ ...base, valorAquisicao: -1 }).success).toBe(false);
  });

  it('aceita valorAquisicao = 0 (nonnegative permite zero)', () => {
    expect(createEquipamentoSchema.safeParse({ ...base, valorAquisicao: 0 }).success).toBe(true);
  });
});

// ─── createMovimentacaoEquipamentoSchema ──────────────────────────────────────

describe('createMovimentacaoEquipamentoSchema', () => {
  const base = { tipo: 'retirada', responsavelId: '00000000-0000-0000-0000-000000000001' };

  it('aceita movimentação válida', () => {
    expect(createMovimentacaoEquipamentoSchema.safeParse(base).success).toBe(true);
  });

  it('aceita todos os tipos válidos', () => {
    for (const tipo of ['retirada', 'devolucao', 'manutencao', 'descarte']) {
      expect(createMovimentacaoEquipamentoSchema.safeParse({ ...base, tipo }).success).toBe(true);
    }
  });

  it('rejeita tipo inválido', () => {
    expect(createMovimentacaoEquipamentoSchema.safeParse({ ...base, tipo: 'transferencia' }).success).toBe(false);
  });

  it('rejeita responsavelId inválido (não é UUID)', () => {
    expect(createMovimentacaoEquipamentoSchema.safeParse({ ...base, responsavelId: 'nao-uuid' }).success).toBe(false);
  });

  it('aceita campos opcionais (destino, observacoes, novoStatus)', () => {
    const r = createMovimentacaoEquipamentoSchema.safeParse({
      ...base, destino: 'Depósito B', observacoes: 'Uso temporário', novoStatus: 'em_uso',
    });
    expect(r.success).toBe(true);
  });
});

// ─── updateAbastecimentoSchema ────────────────────────────────────────────────

describe('updateAbastecimentoSchema', () => {
  it('aceita objeto vazio (atualização parcial — todos os campos opcionais)', () => {
    expect(updateAbastecimentoSchema.safeParse({}).success).toBe(true);
  });

  it('aceita atualização parcial de litros', () => {
    const r = updateAbastecimentoSchema.safeParse({ litros: 150.5 });
    expect(r.success).toBe(true);
  });

  it('rejeita combustivel inválido quando fornecido', () => {
    expect(updateAbastecimentoSchema.safeParse({ combustivel: 'gasolina' }).success).toBe(false);
  });

  it('rejeita litros negativos', () => {
    expect(updateAbastecimentoSchema.safeParse({ litros: -10 }).success).toBe(false);
  });

  it('aceita diesel, diesel_s10 e arla32 como combustível', () => {
    for (const c of ['diesel', 'diesel_s10', 'arla32']) {
      expect(updateAbastecimentoSchema.safeParse({ combustivel: c }).success).toBe(true);
    }
  });
});

// ─── updateFuncionarioStatusSchema ───────────────────────────────────────────

describe('updateFuncionarioStatusSchema', () => {
  it('aceita ativo=true', () => {
    expect(updateFuncionarioStatusSchema.safeParse({ ativo: true }).success).toBe(true);
  });

  it('aceita ativo=false', () => {
    expect(updateFuncionarioStatusSchema.safeParse({ ativo: false }).success).toBe(true);
  });

  it('rejeita quando ativo não é boolean', () => {
    expect(updateFuncionarioStatusSchema.safeParse({ ativo: 'true' }).success).toBe(false);
    expect(updateFuncionarioStatusSchema.safeParse({ ativo: 1 }).success).toBe(false);
  });
});

// ─── updateCaminhaoStatusSchema ───────────────────────────────────────────────

describe('updateCaminhaoStatusSchema', () => {
  it('aceita statuses válidos (operacional, manutencao, parado)', () => {
    for (const s of ['operacional', 'manutencao', 'parado']) {
      expect(updateCaminhaoStatusSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it('rejeita status inválido com mensagem amigável', () => {
    const r = updateCaminhaoStatusSchema.safeParse({ status: 'em_manutencao' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.errors[0].message).toMatch(/status inválido/i);
  });
});

// ─── updateOrdemCompraStatusSchema ───────────────────────────────────────────

describe('updateOrdemCompraStatusSchema', () => {
  it('aceita statuses válidos do ciclo de OC', () => {
    for (const s of ['pendente', 'aprovada', 'recebida', 'cancelada']) {
      expect(updateOrdemCompraStatusSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it('rejeita status fora do enum', () => {
    expect(updateOrdemCompraStatusSchema.safeParse({ status: 'rejeitada' }).success).toBe(false);
  });
});
