jest.mock('../config/database', () => ({
  prisma: {
    funcionario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { FuncionariosService } from '../modules/funcionarios/funcionarios.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';

const mockFindUnique = prisma.funcionario.findUnique as jest.Mock;
const mockFindFirst  = prisma.funcionario.findFirst as jest.Mock;
const mockFindMany   = prisma.funcionario.findMany as jest.Mock;
const mockCreate     = prisma.funcionario.create as jest.Mock;
const mockUpdate     = prisma.funcionario.update as jest.Mock;
const mockCount      = prisma.funcionario.count as jest.Mock;

const svc = new FuncionariosService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── criar ────────────────────────────────────────────────────────────────────

const inputFuncionario = {
  nome: 'Carlos Silva', cpf: '123.456.789-00', cargo: 'motorista',
  telefone: '(11) 99999-9999', email: 'carlos@omp.com',
};

describe('FuncionariosService.criar', () => {
  it('lança AppError 409 quando CPF já existe', async () => {
    mockFindUnique.mockResolvedValue({ id: 'f-existing', cpf: inputFuncionario.cpf });

    const err = await svc.criar(inputFuncionario).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('CPF já cadastrado');
  });

  it('lança AppError 409 quando email já está cadastrado (fix sessão 35)', async () => {
    mockFindUnique.mockResolvedValue(null);                               // CPF disponível
    mockFindFirst.mockResolvedValue({ id: 'f-outro', email: inputFuncionario.email }); // email ocupado

    const err = await svc.criar(inputFuncionario).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toContain('E-mail');
  });

  it('cria funcionário quando CPF disponível', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null); // email também disponível
    mockCreate.mockResolvedValue({ id: 'f-new', ...inputFuncionario });

    await svc.criar(inputFuncionario);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cpf: inputFuncionario.cpf, cargo: 'motorista' }),
      }),
    );
  });

  it('converte cnhValidade string para Date quando informada', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'f-new' });

    await svc.criar({ ...inputFuncionario, cnhValidade: '2027-12-31' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cnhValidade: expect.any(Date) }),
      }),
    );
  });

  it('define cnhValidade=null quando não informada', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'f-new' });

    await svc.criar(inputFuncionario);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cnhValidade: null }),
      }),
    );
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('FuncionariosService.atualizar', () => {
  it('lança AppError 409 quando email pertence a outro funcionário', async () => {
    mockFindFirst.mockResolvedValue({ id: 'f-other' });

    const err = await svc.atualizar('f-1', { email: 'outro@omp.com' }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('E-mail já cadastrado para outro funcionário');
  });

  it('atualiza quando email não está em uso por outro', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ id: 'f-1', nome: 'Atualizado' });

    await svc.atualizar('f-1', { email: 'novo@omp.com', nome: 'Atualizado' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f-1' } }),
    );
  });

  it('não verifica conflito de email quando email não é alterado', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', nome: 'Só nome' });

    await svc.atualizar('f-1', { nome: 'Só nome' });

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('converte cnhValidade string para Date quando fornecida', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ id: 'f-1', nome: 'Carlos' });

    await svc.atualizar('f-1', { email: 'carlos@omp.com', cnhValidade: '2029-06-30' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cnhValidade: expect.any(Date) }),
      }),
    );
  });

  it('cnhValidade=undefined quando não fornecida (campo omitido → sem alteração)', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', nome: 'Carlos' });

    await svc.atualizar('f-1', { nome: 'Carlos' });

    const chamada = mockUpdate.mock.calls[0][0];
    expect(chamada.data.cnhValidade).toBeUndefined();
  });
});

// ─── desativar ────────────────────────────────────────────────────────────────

describe('FuncionariosService.desativar', () => {
  it('define ativo=false sem remover o registro', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', ativo: false });

    await svc.desativar('f-1');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f-1' }, data: { ativo: false } }),
    );
  });
});

// ─── atualizar — campo ativo (PATCH /:id/status) ─────────────────────────────

describe('FuncionariosService.atualizar — campo ativo', () => {
  it('desativa funcionário quando ativo=false é passado diretamente', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', ativo: false });

    await svc.atualizar('f-1', { ativo: false });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f-1' }, data: expect.objectContaining({ ativo: false }) }),
    );
  });

  it('reativa funcionário quando ativo=true é passado', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', ativo: true });

    await svc.atualizar('f-1', { ativo: true });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f-1' }, data: expect.objectContaining({ ativo: true }) }),
    );
  });

  it('não checa conflito de email quando apenas ativo é alterado', async () => {
    mockUpdate.mockResolvedValue({ id: 'f-1', ativo: false });

    await svc.atualizar('f-1', { ativo: false });

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('FuncionariosService.getKPIs', () => {
  it('retorna estrutura completa com cnhVencendo', async () => {
    // 5 chamadas a count: total, motoristas, mecanicos, ativos, cnhVencendo
    mockCount
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(6)   // motoristas ativos
      .mockResolvedValueOnce(3)   // mecanicos ativos
      .mockResolvedValueOnce(8)   // ativos
      .mockResolvedValueOnce(2);  // cnhVencendo

    const result = await svc.getKPIs();

    expect(result).toEqual({
      total: 10,
      motoristas: 6,
      mecanicos: 3,
      ativos: 8,
      inativos: 2,      // total - ativos = 10 - 8
      cnhVencendo: 2,
    });
  });

  it('calcula inativos como total − ativos', async () => {
    mockCount
      .mockResolvedValueOnce(20)  // total
      .mockResolvedValueOnce(12)  // motoristas
      .mockResolvedValueOnce(5)   // mecanicos
      .mockResolvedValueOnce(15)  // ativos
      .mockResolvedValueOnce(0);  // cnhVencendo

    const result = await svc.getKPIs();

    expect(result.inativos).toBe(5); // 20 - 15
  });

  it('retorna cnhVencendo=0 quando nenhuma CNH vence em 30 dias', async () => {
    mockCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0); // zero CNHs vencendo

    const result = await svc.getKPIs();

    expect(result.cnhVencendo).toBe(0);
  });

  it('consulta cnhVencendo filtrando cargo=motorista e ativo=true', async () => {
    mockCount.mockResolvedValue(0);

    await svc.getKPIs();

    // A 5ª chamada (índice 4) deve conter os filtros corretos
    const chamadas = mockCount.mock.calls;
    const chamadaCnh = chamadas[4][0]; // 5º argumento posicional
    expect(chamadaCnh.where).toMatchObject({
      cargo: 'motorista',
      ativo: true,
      cnhValidade: expect.objectContaining({ lte: expect.any(Date) }),
    });
  });
});

// ─── listar — construção do where ─────────────────────────────────────────────

describe('FuncionariosService.listar — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '' };
  const funcRow = { id: 'f-1', nome: 'Carlos', cpf: '000', cargo: 'motorista', telefone: '', ativo: true };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([funcRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica ativo=true por padrão quando ativo não é informado', async () => {
    await svc.listar(paginacao);

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true });
  });

  it('aplica filtro cargo quando fornecido (sem cnhAlerta)', async () => {
    await svc.listar({ ...paginacao, cargo: 'mecanico' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true, cargo: 'mecanico' });
  });

  it('aplica cnhValidade.lte quando cnhAlerta=true (ignora cargo)', async () => {
    await svc.listar({ ...paginacao, cnhAlerta: true, cargo: 'motorista' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.cnhValidade).toEqual(
      expect.objectContaining({ lte: expect.any(Date) }),
    );
    // cargo deve ser ignorado quando cnhAlerta=true
    expect(chamada.where.cargo).toBeUndefined();
  });

  it('aplica OR de busca em nome, cpf e email', async () => {
    await svc.listar({ ...paginacao, search: 'carlos' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(3);
    expect(chamada.where.OR[0]).toMatchObject({ nome: { contains: 'carlos' } });
  });

  it('retorna funcionarios e total', async () => {
    const result = await svc.listar(paginacao);

    expect(result.funcionarios).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── motoristasDisponiveis ────────────────────────────────────────────────────

describe('FuncionariosService.motoristasDisponiveis', () => {
  it('filtra cargo=motorista, ativo=true e sem caminhão ativo', async () => {
    mockFindMany.mockResolvedValue([]);

    await svc.motoristasDisponiveis();

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({
      cargo: 'motorista',
      ativo: true,
      caminhoesMotorista: { none: { status: { notIn: ['parado'] } } },
    });
  });

  it('retorna os motoristas disponíveis', async () => {
    const motorista = { id: 'f-1', nome: 'João', cnhCategoria: 'E', cnhValidade: '2028-01-01', telefone: '(11) 999' };
    mockFindMany.mockResolvedValue([motorista]);

    const result = await svc.motoristasDisponiveis();

    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('João');
  });
});

// ─── cnhVencendo ──────────────────────────────────────────────────────────────

describe('FuncionariosService.cnhVencendo', () => {
  it('filtra cargo=motorista, ativo=true e cnhValidade dentro do prazo', async () => {
    mockFindMany.mockResolvedValue([]);

    await svc.cnhVencendo(30);

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({
      cargo: 'motorista',
      ativo: true,
      cnhValidade: expect.objectContaining({ lte: expect.any(Date) }),
    });
  });

  it('usa 30 dias como padrão quando diasAviso não informado', async () => {
    mockFindMany.mockResolvedValue([]);

    await svc.cnhVencendo(); // sem argumento

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const chamada = mockFindMany.mock.calls[0][0];
    // limite deve ser ~30 dias a partir de agora
    const lte: Date = chamada.where.cnhValidade.lte;
    const diffDias = (lte.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDias).toBeCloseTo(30, 0);
  });

  it('retorna os motoristas com CNH vencendo', async () => {
    const motorista = { id: 'f-1', nome: 'Carlos', cnhCategoria: 'E', cnhValidade: new Date(), telefone: '' };
    mockFindMany.mockResolvedValue([motorista]);

    const result = await svc.cnhVencendo(30);

    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('Carlos');
  });
});
