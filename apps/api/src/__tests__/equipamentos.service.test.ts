jest.mock('../config/database', () => ({
  prisma: {
    equipamento: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EquipamentosService } from '../modules/equipamentos/equipamentos.service';
import { prisma } from '../config/database';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst        = prisma.equipamento.findFirst as jest.Mock;
const mockFindMany         = prisma.equipamento.findMany as jest.Mock;
const mockFindUniqueOrThrow = prisma.equipamento.findUniqueOrThrow as jest.Mock;
const mockCreate           = prisma.equipamento.create as jest.Mock;
const mockUpdate           = prisma.equipamento.update as jest.Mock;
const mockCount            = prisma.equipamento.count as jest.Mock;
const mockAggregate        = prisma.equipamento.aggregate as jest.Mock;
const mockTransaction      = prisma.$transaction as jest.Mock;

const svc = new EquipamentosService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── criar — geração de código por tipo ──────────────────────────────────────

const inputBase = { nome: 'Guincho Elétrico', tipo: 'equipamento' };

describe('EquipamentosService.criar — geração de código', () => {
  it('gera EQP-001 para tipo=equipamento quando não há cadastros', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'eq-1', codigo: 'EQP-001', ...inputBase });

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'EQP-001' }) }),
    );
  });

  it('gera FER-001 para tipo=ferramenta', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'eq-2', codigo: 'FER-001', nome: 'Chave de Fenda', tipo: 'ferramenta' });

    await svc.criar({ nome: 'Chave de Fenda', tipo: 'ferramenta' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'FER-001' }) }),
    );
  });

  it('incrementa código a partir do último (EQP-003 → EQP-004)', async () => {
    mockFindFirst.mockResolvedValue({ codigo: 'EQP-003' });
    mockCreate.mockResolvedValue({ id: 'eq-4', codigo: 'EQP-004', ...inputBase });

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'EQP-004' }) }),
    );
  });

  it('converte proximaRevisao string para Date quando informada', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'eq-1', codigo: 'EQP-001' });

    await svc.criar({ ...inputBase, proximaRevisao: '2027-06-30' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaRevisao: expect.any(Date) }),
      }),
    );
  });

  it('reintegra após P2002 e cria com sucesso na segunda tentativa', async () => {
    mockFindFirst.mockResolvedValue(null);
    const p2002 = new PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002', clientVersion: '5.0.0',
    });
    mockCreate
      .mockRejectedValueOnce(p2002) // 1ª tentativa → colisão
      .mockResolvedValueOnce({ id: 'eq-1', codigo: 'EQP-001', ...inputBase }); // 2ª tentativa → ok

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── registrarMovimentacao ────────────────────────────────────────────────────

describe('EquipamentosService.registrarMovimentacao', () => {
  it('cria movimentação e atualiza status quando novoStatus fornecido', async () => {
    const txMovCreate = jest.fn().mockResolvedValue({ id: 'mov-1', tipo: 'retirada' });
    const txEqUpdate  = jest.fn().mockResolvedValue({});
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({
        movimentacaoEquipamento: { create: txMovCreate },
        equipamento: { update: txEqUpdate },
      }),
    );

    await svc.registrarMovimentacao('eq-1', {
      tipo: 'retirada',
      responsavelId: 'func-1',
      destino: 'Obra A',
      novoStatus: 'em_uso',
    });

    expect(txMovCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'retirada', responsavelId: 'func-1', destino: 'Obra A' }),
      }),
    );
    expect(txEqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'eq-1' },
        data: expect.objectContaining({ status: 'em_uso', responsavelId: 'func-1' }),
      }),
    );
  });

  it('não atualiza equipamento quando novoStatus não é fornecido', async () => {
    const txMovCreate = jest.fn().mockResolvedValue({ id: 'mov-2', tipo: 'manutencao' });
    const txEqUpdate  = jest.fn();
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({
        movimentacaoEquipamento: { create: txMovCreate },
        equipamento: { update: txEqUpdate },
      }),
    );

    await svc.registrarMovimentacao('eq-1', { tipo: 'manutencao', responsavelId: 'func-1' });

    expect(txMovCreate).toHaveBeenCalledTimes(1);
    expect(txEqUpdate).not.toHaveBeenCalled();
  });

  it('define responsavelId=null na devolução (limpa responsável do equipamento)', async () => {
    const txMovCreate = jest.fn().mockResolvedValue({ id: 'mov-3', tipo: 'devolucao' });
    const txEqUpdate  = jest.fn().mockResolvedValue({});
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({
        movimentacaoEquipamento: { create: txMovCreate },
        equipamento: { update: txEqUpdate },
      }),
    );

    await svc.registrarMovimentacao('eq-1', {
      tipo: 'devolucao',
      responsavelId: 'func-1',
      novoStatus: 'disponivel',
    });

    expect(txEqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'disponivel', responsavelId: null }),
      }),
    );
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('EquipamentosService.getKPIs', () => {
  // 5 chamadas a count: total, disponiveis, emUso, manutencao, revisaoVencendo
  function setupKPIs(total: number, disponiveis: number, emUso: number, manutencao: number, revisaoVencendo: number, valorPatrimonio: number | null) {
    mockCount
      .mockResolvedValueOnce(total)
      .mockResolvedValueOnce(disponiveis)
      .mockResolvedValueOnce(emUso)
      .mockResolvedValueOnce(manutencao)
      .mockResolvedValueOnce(revisaoVencendo);
    mockAggregate.mockResolvedValueOnce({ _sum: { valorAquisicao: valorPatrimonio } });
  }

  it('retorna estrutura completa com todos os campos', async () => {
    setupKPIs(30, 20, 7, 3, 4, 150000);

    const result = await svc.getKPIs();

    expect(result).toEqual({
      total: 30,
      disponiveis: 20,
      emUso: 7,
      manutencao: 3,
      revisaoVencendo: 4,
      valorPatrimonio: 150000,
    });
  });

  it('retorna valorPatrimonio=0 quando aggregate retorna null', async () => {
    setupKPIs(5, 5, 0, 0, 0, null);

    const result = await svc.getKPIs();

    expect(result.valorPatrimonio).toBe(0);
  });

  it('retorna revisaoVencendo=0 quando todos os equipamentos estão em dia', async () => {
    setupKPIs(10, 10, 0, 0, 0, 50000);

    const result = await svc.getKPIs();

    expect(result.revisaoVencendo).toBe(0);
  });

  it('filtra revisaoVencendo por ativo=true e proximaRevisao ≤ 30 dias', async () => {
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { valorAquisicao: null } });

    await svc.getKPIs();

    const chamadaRevisao = mockCount.mock.calls[4][0];
    expect(chamadaRevisao.where).toMatchObject({
      ativo: true,
      proximaRevisao: expect.objectContaining({ lte: expect.any(Date) }),
    });
  });
});

// ─── revisoesVencendo ─────────────────────────────────────────────────────────

describe('EquipamentosService.revisoesVencendo', () => {
  it('marca vencida=true para revisão com data no passado', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockFindMany.mockResolvedValue([
      { id: 'eq-1', codigo: 'EQP-001', nome: 'Guincho', tipo: 'equipamento', proximaRevisao: ontem, status: 'disponivel', responsavelId: null, responsavel: null },
    ]);

    const result = await svc.revisoesVencendo();

    expect(result[0].vencida).toBe(true);
    expect(result[0].diasRestantes).toBeLessThan(0);
  });

  it('marca vencida=false para revisão com data no futuro', async () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFindMany.mockResolvedValue([
      { id: 'eq-2', codigo: 'EQP-002', nome: 'Serra', tipo: 'ferramenta', proximaRevisao: amanha, status: 'em_uso', responsavelId: null, responsavel: null },
    ]);

    const result = await svc.revisoesVencendo();

    expect(result[0].vencida).toBe(false);
    expect(result[0].diasRestantes).toBeGreaterThan(0);
  });

  it('retorna array vazio quando não há revisões pendentes', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await svc.revisoesVencendo();

    expect(result).toEqual([]);
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────

describe('EquipamentosService.listar — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '' };
  const equipRow = { id: 'eq-1', codigo: 'EQP-001', nome: 'Guincho', responsavel: null };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([equipRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica filtro de tipo quando fornecido', async () => {
    await svc.listar({ ...paginacao, tipo: 'ferramenta' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true, tipo: 'ferramenta' });
  });

  it('aplica filtro de status quando fornecido', async () => {
    await svc.listar({ ...paginacao, status: 'em_uso' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ ativo: true, status: 'em_uso' });
  });

  it('aplica filtro revisoesVencendo com proximaRevisao.lte e não inclui tipo', async () => {
    await svc.listar({ ...paginacao, revisoesVencendo: true, tipo: 'equipamento' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.proximaRevisao).toEqual(expect.objectContaining({ lte: expect.any(Date) }));
    // tipo deve ser ignorado quando revisoesVencendo=true
    expect(chamada.where.tipo).toBeUndefined();
  });

  it('aplica OR de busca quando search fornecido', async () => {
    await svc.listar({ ...paginacao, search: 'guincho' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(3);
    expect(chamada.where.OR[0]).toMatchObject({ nome: { contains: 'guincho' } });
  });

  it('retorna equipamentos e total', async () => {
    const result = await svc.listar(paginacao);

    expect(result.equipamentos).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── buscar ───────────────────────────────────────────────────────────────────

describe('EquipamentosService.buscar', () => {
  it('chama findUniqueOrThrow com id correto', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'eq-1', codigo: 'EQP-001', movimentacoes: [] });

    const result = await svc.buscar('eq-1');

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'eq-1' } }),
    );
    expect(result.codigo).toBe('EQP-001');
  });
});

// ─── atualizar — conversão de proximaRevisao ──────────────────────────────────

describe('EquipamentosService.atualizar — proximaRevisao', () => {
  const base = { id: 'eq-1', codigo: 'EQP-001' };

  it('converte string ISO para Date', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaRevisao: new Date('2027-12-01'), responsavel: null });

    await svc.atualizar('eq-1', { proximaRevisao: '2027-12-01' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaRevisao: expect.any(Date) }),
      }),
    );
  });

  it('converte string vazia para null', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaRevisao: null, responsavel: null });

    await svc.atualizar('eq-1', { proximaRevisao: '' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ proximaRevisao: null }) }),
    );
  });

  it('converte null explícito para null', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaRevisao: null, responsavel: null });

    await svc.atualizar('eq-1', { proximaRevisao: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ proximaRevisao: null }) }),
    );
  });

  // ─── descarte (sessão 35) ─────────────────────────────────────────────────

  it('status=descartado força ativo=false independente de data.ativo (sessão 35)', async () => {
    mockUpdate.mockResolvedValue({ ...base, status: 'descartado', ativo: false, responsavel: null });

    await svc.atualizar('eq-1', { status: 'descartado', ativo: true });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ativo: false }),
      }),
    );
  });

  it('ativo preservado quando status não é descartado', async () => {
    mockUpdate.mockResolvedValue({ ...base, status: 'em_uso', ativo: true, responsavel: null });

    await svc.atualizar('eq-1', { status: 'em_uso', ativo: true });

    const chamada = mockUpdate.mock.calls[0][0];
    // data.ativo = true, data.status != 'descartado' → ativo: true
    expect(chamada.data.ativo).toBe(true);
  });

  it('localizacao=null remove localização do equipamento (sessão 33)', async () => {
    mockUpdate.mockResolvedValue({ ...base, localizacao: null, responsavel: null });

    await svc.atualizar('eq-1', { localizacao: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ localizacao: null }) }),
    );
  });

  it('observacoes=empty string é tratado como null', async () => {
    mockUpdate.mockResolvedValue({ ...base, observacoes: null, responsavel: null });

    await svc.atualizar('eq-1', { observacoes: '' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ observacoes: null }) }),
    );
  });
});
