jest.mock('../config/database', () => ({
  prisma: {
    material: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    categoria: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    fornecedor: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    movimentacao: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EstoqueService } from '../modules/estoque/estoque.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

const mockFindFirst        = prisma.material.findFirst as jest.Mock;
const mockFindMany         = prisma.material.findMany as jest.Mock;
const mockCount            = prisma.material.count as jest.Mock;
const mockTransaction      = prisma.$transaction as jest.Mock;
const mockQueryRaw         = prisma.$queryRaw as jest.Mock;
const mockWarn             = logger.warn as jest.Mock;
const mockCategoriaFindFirst = prisma.categoria.findFirst as jest.Mock;
const mockCategoriaCreate    = prisma.categoria.create as jest.Mock;
const mockFornecedorFindFirst = prisma.fornecedor.findFirst as jest.Mock;
const mockFornecedorFindMany  = prisma.fornecedor.findMany as jest.Mock;
const mockFornecedorCreate    = prisma.fornecedor.create as jest.Mock;
const mockFornecedorCount     = prisma.fornecedor.count as jest.Mock;
const mockMovFindMany        = prisma.movimentacao.findMany as jest.Mock;
const mockMovCount           = prisma.movimentacao.count as jest.Mock;

const svc = new EstoqueService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── criarMaterial ───────────────────────────────────────────────────────────

const inputMaterial = {
  nome: 'Filtro de ar', categoriaId: 'cat-1', unidadeMedida: 'unidade',
  precoUnitario: 45.9, estoqueMinimo: 5, estoqueMaximo: 20, fornecedorId: 'forn-1',
};

function makeTxMaterial(overrides: { codigo?: string } = {}) {
  const codigo = overrides.codigo ?? 'MAT-001';
  const txMaterialCreate = jest.fn().mockResolvedValue({ id: 'mat-new', codigo });
  const txEstoqueCreate  = jest.fn().mockResolvedValue({});
  const tx = { material: { create: txMaterialCreate }, estoque: { create: txEstoqueCreate } };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

describe('EstoqueService.criarMaterial — geração de código', () => {
  it('gera MAT-001 quando não há materiais cadastrados', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxMaterial({ codigo: 'MAT-001' });

    await svc.criarMaterial(inputMaterial);

    expect(tx.material.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'MAT-001' }) }),
    );
  });

  it('incrementa o código a partir do último (MAT-007 → MAT-008)', async () => {
    mockFindFirst.mockResolvedValue({ codigo: 'MAT-007' });
    const tx = makeTxMaterial({ codigo: 'MAT-008' });

    await svc.criarMaterial(inputMaterial);

    expect(tx.material.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'MAT-008' }) }),
    );
  });

  it('cria registro de estoque com quantidade=0', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxMaterial();

    await svc.criarMaterial(inputMaterial);

    expect(tx.estoque.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantidade: 0 }) }),
    );
  });
});

// ─── registrarSaida ──────────────────────────────────────────────────────────

function makeTxSaida(options: { count: number; quantidade?: number; estoqueMinimo?: number }) {
  const qtd   = options.quantidade ?? 10;
  const min   = options.estoqueMinimo ?? 2;
  const tx = {
    estoque: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        quantidade: qtd,
        material: { nome: 'Filtro', unidadeMedida: 'unidade', precoUnitario: 45.9, estoqueMinimo: min },
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.count }),
    },
    movimentacao: { create: jest.fn().mockResolvedValue({ id: 'mov-1' }) },
  };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

describe('EstoqueService.registrarSaida — estoque insuficiente', () => {
  it('lança erro quando updateMany retorna count=0', async () => {
    makeTxSaida({ count: 0, quantidade: 3 });

    await expect(
      svc.registrarSaida('mat-1', 10, 'uso em OS', 'user-1'),
    ).rejects.toThrow('Estoque insuficiente');
  });
});

describe('EstoqueService.registrarSaida — saída bem-sucedida', () => {
  it('cria movimentação de saída com tipo correto', async () => {
    const tx = makeTxSaida({ count: 1, quantidade: 10 });

    await svc.registrarSaida('mat-1', 4, 'uso em OS', 'user-1');

    expect(tx.movimentacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: 'saida', quantidade: 4 }) }),
    );
  });

  it('emite warn quando quantidade cai abaixo do mínimo', async () => {
    // quantidade=3, remove 2, fica 1 < estoqueMinimo=5 → warn
    makeTxSaida({ count: 1, quantidade: 3, estoqueMinimo: 5 });

    await svc.registrarSaida('mat-1', 2, 'uso em OS', 'user-1');

    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('abaixo do mínimo'));
  });

  it('não emite warn quando estoque permanece acima do mínimo', async () => {
    // quantidade=10, remove 3, fica 7 > estoqueMinimo=2 → sem warn
    makeTxSaida({ count: 1, quantidade: 10, estoqueMinimo: 2 });

    await svc.registrarSaida('mat-1', 3, 'uso em OS', 'user-1');

    expect(mockWarn).not.toHaveBeenCalled();
  });
});

// ─── materiaisAbaixoDoMinimo ─────────────────────────────────────────────────

describe('EstoqueService.materiaisAbaixoDoMinimo — mapeamento de rows', () => {
  it('converte estoqueMinimo e quantidade de BigInt para Number', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 'mat-1', codigo: 'MAT-001', nome: 'Óleo', unidadeMedida: 'litro', estoqueMinimo: 10n, quantidade: 3n },
    ]);

    const result = await svc.materiaisAbaixoDoMinimo();

    expect(typeof result[0].estoqueMinimo).toBe('number');
    expect(result[0].estoqueMinimo).toBe(10);
    expect(typeof result[0].estoques[0].quantidade).toBe('number');
    expect(result[0].estoques[0].quantidade).toBe(3);
  });

  it('retorna estrutura com estoques array aninhado', async () => {
    mockQueryRaw.mockResolvedValue([
      { id: 'mat-2', codigo: 'MAT-002', nome: 'Filtro', unidadeMedida: 'unidade', estoqueMinimo: 5, quantidade: 0 },
    ]);

    const [item] = await svc.materiaisAbaixoDoMinimo();

    expect(item).toEqual({
      id: 'mat-2',
      codigo: 'MAT-002',
      nome: 'Filtro',
      unidadeMedida: 'unidade',
      estoqueMinimo: 5,
      estoques: [{ quantidade: 0 }],
    });
  });

  it('retorna array vazio quando query não retorna linhas', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await svc.materiaisAbaixoDoMinimo();

    expect(result).toEqual([]);
  });
});

// ─── getKPIs ─────────────────────────────────────────────────────────────────

describe('EstoqueService.getKPIs', () => {
  it('calcula itensAbaixoMinimo e totalMateriais corretamente', async () => {
    mockCount.mockResolvedValue(15);
    // $queryRaw chamado 2x: 1) dentro de materiaisAbaixoDoMinimo 2) para valorEstoque
    mockQueryRaw
      .mockResolvedValueOnce([
        { id: 'm1', codigo: 'MAT-001', nome: 'A', unidadeMedida: 'un', estoqueMinimo: 5, quantidade: 1 },
        { id: 'm2', codigo: 'MAT-002', nome: 'B', unidadeMedida: 'un', estoqueMinimo: 3, quantidade: 0 },
      ])
      .mockResolvedValueOnce([{ valor: 12500.5 }]);

    const kpis = await svc.getKPIs();

    expect(kpis.totalMateriais).toBe(15);
    expect(kpis.itensAbaixoMinimo).toBe(2);
  });

  it('arredonda valorEstoque para 2 casas decimais', async () => {
    mockCount.mockResolvedValue(5);
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ valor: 9999.9999 }]);

    const kpis = await svc.getKPIs();

    expect(kpis.valorEstoque).toBe(10000);
  });

  it('retorna valores zerados quando estoque está vazio', async () => {
    mockCount.mockResolvedValue(0);
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ valor: 0 }]);

    const kpis = await svc.getKPIs();

    expect(kpis.valorEstoque).toBe(0);
    expect(kpis.itensAbaixoMinimo).toBe(0);
    expect(kpis.materiaisCriticos).toEqual([]);
  });
});

// ─── registrarEntrada ─────────────────────────────────────────────────────────

function makeTxEntrada() {
  const txEstoqueUpdate     = jest.fn().mockResolvedValue({ materialId: 'mat-1', quantidade: 15 });
  const txMovimentacaoCreate = jest.fn().mockResolvedValue({ id: 'mov-e1', tipo: 'entrada' });
  const txMaterialUpdate    = jest.fn().mockResolvedValue({});
  const tx = {
    estoque:     { update: txEstoqueUpdate },
    movimentacao: { create: txMovimentacaoCreate },
    material:    { update: txMaterialUpdate },
  };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

describe('EstoqueService.registrarEntrada', () => {
  it('incrementa o estoque com { increment: quantidade }', async () => {
    const tx = makeTxEntrada();

    await svc.registrarEntrada('mat-1', 5, 45.9, 'compra OC-001', 'user-1');

    expect(tx.estoque.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { materialId: 'mat-1' },
        data: expect.objectContaining({ quantidade: { increment: 5 } }),
      }),
    );
  });

  it('cria movimentação com tipo=entrada e dados corretos', async () => {
    const tx = makeTxEntrada();

    await svc.registrarEntrada('mat-1', 5, 45.9, 'compra OC-001', 'user-1');

    expect(tx.movimentacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialId: 'mat-1',
          tipo: 'entrada',
          quantidade: 5,
          precoUnitario: 45.9,
          motivo: 'compra OC-001',
          usuarioId: 'user-1',
        }),
      }),
    );
  });

  it('atualiza precoUnitario do material com o novo preço', async () => {
    const tx = makeTxEntrada();

    await svc.registrarEntrada('mat-1', 5, 48.0, 'reposição', 'user-1');

    expect(tx.material.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mat-1' },
        data: { precoUnitario: 48.0 },
      }),
    );
  });
});

// ─── listarMateriais — filtros ────────────────────────────────────────────────

describe('EstoqueService.listarMateriais — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '', orderBy: 'nome', order: 'asc' as const };
  const matRow = { id: 'mat-1', codigo: 'MAT-001', nome: 'Óleo', ativo: true, categoria: null, fornecedor: null, estoques: [] };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([matRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica ativo=true por padrão', async () => {
    await svc.listarMateriais(paginacao);

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true });
  });

  it('aplica categoriaId quando fornecido', async () => {
    await svc.listarMateriais({ ...paginacao, categoriaId: 'cat-1' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true, categoriaId: 'cat-1' });
  });

  it('aplica OR de busca em nome e código', async () => {
    await svc.listarMateriais({ ...paginacao, search: 'óleo' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(2);
    expect(chamada.where.OR[0]).toMatchObject({ nome: { contains: 'óleo' } });
  });

  it('usa $queryRaw para filtrar abaixoMinimo e injeta ids no where', async () => {
    // $queryRaw retorna ids dos materiais críticos
    mockQueryRaw.mockResolvedValue([{ id: 'mat-1' }, { id: 'mat-2' }]);

    await svc.listarMateriais({ ...paginacao, abaixoMinimo: true });

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.id).toEqual({ in: ['mat-1', 'mat-2'] });
  });

  it('retorna materiais e total', async () => {
    const result = await svc.listarMateriais(paginacao);

    expect(result.materiais).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── criarCategoria ───────────────────────────────────────────────────────────

describe('EstoqueService.criarCategoria', () => {
  it('lança AppError 409 quando já existe categoria com o mesmo nome', async () => {
    mockCategoriaFindFirst.mockResolvedValue({ id: 'cat-existing', nome: 'Filtros' });

    const err = await svc.criarCategoria({ nome: 'Filtros' }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toContain('categoria');
  });

  it('cria categoria quando nome é único', async () => {
    mockCategoriaFindFirst.mockResolvedValue(null);
    mockCategoriaCreate.mockResolvedValue({ id: 'cat-new', nome: 'Pneus' });

    await svc.criarCategoria({ nome: 'Pneus' });

    expect(mockCategoriaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: 'Pneus' }) }),
    );
  });
});

// ─── criarFornecedor ──────────────────────────────────────────────────────────

describe('EstoqueService.criarFornecedor', () => {
  const inputFornecedor = {
    razaoSocial: 'Autopeças Brasil Ltda',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 3333-4444',
    email: 'contato@autopecas.com',
  };

  it('lança AppError 409 quando já existe fornecedor com o mesmo CNPJ', async () => {
    mockFornecedorFindFirst.mockResolvedValue({ id: 'forn-existing', cnpj: inputFornecedor.cnpj });

    const err = await svc.criarFornecedor(inputFornecedor).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toContain('CNPJ');
  });

  it('cria fornecedor quando CNPJ é único', async () => {
    mockFornecedorFindFirst.mockResolvedValue(null);
    mockFornecedorCreate.mockResolvedValue({ id: 'forn-new', ...inputFornecedor });

    await svc.criarFornecedor(inputFornecedor);

    expect(mockFornecedorCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cnpj: inputFornecedor.cnpj }),
      }),
    );
  });
});

// ─── listarMovimentacoes — filtros ────────────────────────────────────────────

describe('EstoqueService.listarMovimentacoes — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '', orderBy: 'createdAt', order: 'desc' as const };
  const movRow = { id: 'mov-1', tipo: 'entrada', quantidade: 5, materialId: 'mat-1', material: null, usuario: null };

  beforeEach(() => {
    mockMovFindMany.mockResolvedValue([movRow]);
    mockMovCount.mockResolvedValue(1);
  });

  it('aplica materialId no where quando fornecido', async () => {
    await svc.listarMovimentacoes({ ...paginacao, materialId: 'mat-1' });

    const chamada = mockMovFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ materialId: 'mat-1' });
  });

  it('aplica tipo no where quando fornecido', async () => {
    await svc.listarMovimentacoes({ ...paginacao, tipo: 'saida' });

    const chamada = mockMovFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ tipo: 'saida' });
  });

  it('where vazio quando nenhum filtro fornecido', async () => {
    await svc.listarMovimentacoes(paginacao);

    const chamada = mockMovFindMany.mock.calls[0][0];
    expect(chamada.where).toEqual({});
  });

  it('retorna movimentacoes e total', async () => {
    const result = await svc.listarMovimentacoes(paginacao);

    expect(result.movimentacoes).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── importarMateriais (F5) ───────────────────────────────────────────────────

describe('EstoqueService.importarMateriais', () => {
  const base = { categoriaId: 'cat-1', fornecedorId: 'forn-1' };
  const matOk = { nome: 'Filtro de óleo', unidadeMedida: 'un', precoUnitario: 25, estoqueMinimo: 5, estoqueMaximo: 20 };
  const matFail = { nome: 'Inválido', unidadeMedida: 'un', precoUnitario: -1, estoqueMinimo: 0, estoqueMaximo: 0 };

  let spyCriar: jest.SpyInstance;

  beforeEach(() => {
    spyCriar = jest.spyOn(svc, 'criarMaterial').mockResolvedValue({
      id: 'mat-novo', codigo: 'MAT-001', nome: matOk.nome,
      categoriaId: 'cat-1', fornecedorId: 'forn-1',
      unidadeMedida: 'un', precoUnitario: 25,
      estoqueMinimo: 5, estoqueMaximo: 20, ativo: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
  });

  afterEach(() => { spyCriar.mockRestore(); });

  it('retorna criados=N e erros=[] quando todos os materiais são válidos', async () => {
    const result = await svc.importarMateriais({ ...base, materiais: [matOk, matOk] });

    expect(result.criados).toBe(2);
    expect(result.erros).toHaveLength(0);
    expect(spyCriar).toHaveBeenCalledTimes(2);
  });

  it('registra erro e continua quando um material falha', async () => {
    spyCriar
      .mockResolvedValueOnce({ id: 'mat-1', codigo: 'MAT-001', nome: 'Filtro', categoriaId: 'cat-1', fornecedorId: 'forn-1', unidadeMedida: 'un', precoUnitario: 25, estoqueMinimo: 5, estoqueMaximo: 20, ativo: true, createdAt: new Date(), updatedAt: new Date() })
      .mockRejectedValueOnce(new Error('CNPJ inválido'));

    const result = await svc.importarMateriais({ ...base, materiais: [matOk, matFail] });

    expect(result.criados).toBe(1);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].nome).toBe(matFail.nome);
    expect(result.erros[0].mensagem).toBe('CNPJ inválido');
  });

  it('retorna criados=0 e erros=[] para lista vazia', async () => {
    const result = await svc.importarMateriais({ ...base, materiais: [] });

    expect(result.criados).toBe(0);
    expect(result.erros).toHaveLength(0);
    expect(spyCriar).not.toHaveBeenCalled();
  });

  it('usa mensagem genérica quando erro não é instanceof Error', async () => {
    spyCriar.mockRejectedValueOnce('string error');

    const result = await svc.importarMateriais({ ...base, materiais: [matFail] });

    expect(result.erros[0].mensagem).toBe('Erro desconhecido');
  });
});

// ─── listarFornecedoresPaginado — filtros ─────────────────────────────────────

describe('EstoqueService.listarFornecedoresPaginado — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '', orderBy: 'razaoSocial', order: 'asc' as const };
  const fornRow = { id: 'forn-1', razaoSocial: 'Autopeças Brasil', cnpj: '12.345.678/0001-99' };

  beforeEach(() => {
    mockFornecedorFindMany.mockResolvedValue([fornRow]);
    mockFornecedorCount.mockResolvedValue(1);
  });

  it('where vazio quando search não fornecido', async () => {
    await svc.listarFornecedoresPaginado(paginacao);

    const chamada = mockFornecedorFindMany.mock.calls[0][0];
    expect(chamada.where).toEqual({});
  });

  it('aplica OR de busca em razaoSocial e cnpj quando search fornecido', async () => {
    await svc.listarFornecedoresPaginado({ ...paginacao, search: 'Brasil' });

    const chamada = mockFornecedorFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(2);
    expect(chamada.where.OR[0]).toMatchObject({ razaoSocial: { contains: 'Brasil' } });
    expect(chamada.where.OR[1]).toMatchObject({ cnpj: { contains: 'Brasil' } });
  });

  it('retorna fornecedores e total', async () => {
    const result = await svc.listarFornecedoresPaginado(paginacao);

    expect(result.fornecedores).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('trata search vazio como sem filtro', async () => {
    await svc.listarFornecedoresPaginado({ ...paginacao, search: '' });

    const chamada = mockFornecedorFindMany.mock.calls[0][0];
    expect(chamada.where).toEqual({});
  });
});
