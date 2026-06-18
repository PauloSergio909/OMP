jest.mock('../config/database', () => ({
  prisma: {
    ordemServico: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Nota: itemOS não precisa estar no mock global pois é sempre acessado via tx (transaction)

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { OrdemServicoService } from '../modules/ordem-servico/os.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst   = prisma.ordemServico.findFirst as jest.Mock;
const mockFindMany    = prisma.ordemServico.findMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockCount       = prisma.ordemServico.count as jest.Mock;
const mockAggregate   = prisma.ordemServico.aggregate as jest.Mock;
const mockUpdate      = prisma.ordemServico.update as jest.Mock;

const svc = new OrdemServicoService();

beforeEach(() => { jest.clearAllMocks(); });

function makeTx(statusAtual: string) {
  return {
    ordemServico: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ status: statusAtual }),
      update: jest.fn().mockResolvedValue({ id: 'os-1', caminhaoId: 'cam-1', status: statusAtual }),
      count: jest.fn().mockResolvedValue(1),
    },
    itemOS: { findMany: jest.fn().mockResolvedValue([]) },
    caminhao: { update: jest.fn() },
  };
}

// ─── transições inválidas ─────────────────────────────────────────────────────

describe('OrdemServicoService.atualizarStatus — transições inválidas', () => {
  it('lança AppError 422 para agendada → concluida', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx('agendada')));

    const err = await svc.atualizarStatus('os-1', 'concluida').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('agendada → concluida');
  });

  it('lança AppError 422 para agendada → aguardando_peca', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx('agendada')));

    const err = await svc.atualizarStatus('os-1', 'aguardando_peca').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('lança AppError 422 para aguardando_peca → concluida', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx('aguardando_peca')));

    const err = await svc.atualizarStatus('os-1', 'concluida').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('lança AppError 422 para concluida → em_andamento (estado terminal)', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx('concluida')));

    const err = await svc.atualizarStatus('os-1', 'em_andamento').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('lança AppError 422 para cancelada → agendada (estado terminal)', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx('cancelada')));

    const err = await svc.atualizarStatus('os-1', 'agendada').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });
});

// ─── transições válidas ───────────────────────────────────────────────────────

describe('OrdemServicoService.atualizarStatus — transições válidas', () => {
  it('permite agendada → em_andamento', async () => {
    const tx = makeTx('agendada');
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'em_andamento');

    expect(tx.ordemServico.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'em_andamento' }) }),
    );
  });

  it('permite agendada → cancelada', async () => {
    const tx = makeTx('agendada');
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'cancelada');

    expect(tx.ordemServico.update).toHaveBeenCalled();
  });

  it('calcula custoTotal ao concluir em_andamento', async () => {
    const tx = makeTx('em_andamento');
    tx.itemOS.findMany.mockResolvedValue([
      { quantidade: 2, precoUnitario: 150 },
      { quantidade: 3, precoUnitario: 50 },
    ]);
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'concluida');

    expect(tx.ordemServico.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'concluida', custoTotal: 450 }),
      }),
    );
  });

  it('permite em_andamento → aguardando_peca', async () => {
    const tx = makeTx('em_andamento');
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'aguardando_peca');

    expect(tx.ordemServico.update).toHaveBeenCalled();
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('OrdemServicoService.getKPIs', () => {
  function setupCounts(abertas: number, urgentes: number, atrasadas: number, concluidasMes: number, concluidasPrev: number) {
    // 1ª Promise.all: 7 chamadas (4 count + 2 aggregate + 1 count)
    mockCount
      .mockResolvedValueOnce(abertas)       // abertas
      .mockResolvedValueOnce(urgentes)      // urgentes
      .mockResolvedValueOnce(atrasadas)     // atrasadas
      .mockResolvedValueOnce(concluidasMes) // concluidasMes
      .mockResolvedValueOnce(concluidasPrev)// concluidasMesAnterior
      // 2ª Promise.all: preventivas + corretivas
      .mockResolvedValueOnce(8)             // preventivas
      .mockResolvedValueOnce(2);            // corretivas
    mockAggregate
      .mockResolvedValueOnce({ _sum: { custoTotal: 5000 } })  // custoMes
      .mockResolvedValueOnce({ _sum: { custoTotal: 4000 } }); // custoMesAnterior
  }

  it('retorna atrasadas e urgentes no resultado', async () => {
    setupCounts(12, 3, 2, 8, 7);

    const result = await svc.getKPIs();

    expect(result.atrasadas).toBe(2);
    expect(result.urgentes).toBe(3);
    expect(result.abertas).toBe(12);
  });

  it('calcula taxaPreventiva como % de preventivas sobre total de tipo', async () => {
    setupCounts(10, 1, 0, 5, 4);

    const result = await svc.getKPIs();

    // preventivas=8, corretivas=2, total=10 → taxa=80.0
    expect(result.taxaPreventiva).toBe(80.0);
    expect(result.preventivas).toBe(8);
    expect(result.corretivas).toBe(2);
  });

  it('retorna taxaPreventiva=0 quando não há OS de tipo cadastrado', async () => {
    mockCount
      .mockResolvedValueOnce(0)  // abertas
      .mockResolvedValueOnce(0)  // urgentes
      .mockResolvedValueOnce(0)  // atrasadas
      .mockResolvedValueOnce(0)  // concluidasMes
      .mockResolvedValueOnce(0)  // concluidasMesAnterior
      .mockResolvedValueOnce(0)  // preventivas
      .mockResolvedValueOnce(0); // corretivas
    mockAggregate
      .mockResolvedValueOnce({ _sum: { custoTotal: null } })
      .mockResolvedValueOnce({ _sum: { custoTotal: null } });

    const result = await svc.getKPIs();

    expect(result.taxaPreventiva).toBe(0);
    expect(result.custoMes).toBe(0);       // null → 0
    expect(result.custoMesAnterior).toBe(0);
  });

  it('atrasadas=0 quando todas as OS estão dentro do prazo', async () => {
    setupCounts(5, 1, 0, 3, 2);

    const result = await svc.getKPIs();

    expect(result.atrasadas).toBe(0);
  });
});

// ─── criar — geração de código por ano ───────────────────────────────────────

const inputOS = {
  caminhaoId: 'cam-1', tipo: 'preventiva', descricao: 'Revisão 50k',
  prioridade: 'normal', responsavelId: 'func-1', dataPrevisao: '2026-06-30',
};

const ano = new Date().getFullYear();

function makeTxCriar(extra: { atualizaCaminhao?: boolean } = {}) {
  const txOSCreate     = jest.fn().mockResolvedValue({
    id: 'os-1', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, ...inputOS,
  });
  const txCamUpdate    = jest.fn().mockResolvedValue({});
  const tx = {
    ordemServico: { create: txOSCreate },
    caminhao: { update: txCamUpdate },
  };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

describe('OrdemServicoService.criar — geração de código', () => {
  it(`gera OS-${ano}-001 quando não há OS do ano corrente`, async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxCriar();

    await svc.criar(inputOS);

    expect(tx.ordemServico.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: `OS-${ano}-001` }) }),
    );
  });

  it(`incrementa a partir da última OS do ano (OS-${ano}-007 → OS-${ano}-008)`, async () => {
    mockFindFirst.mockResolvedValue({ codigo: `OS-${ano}-007` });
    const tx = makeTxCriar();
    tx.ordemServico.create.mockResolvedValue({
      id: 'os-8', codigo: `OS-${ano}-008`, caminhao: { codigo: 'CAM-001' }, ...inputOS,
    });

    await svc.criar(inputOS);

    expect(tx.ordemServico.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: `OS-${ano}-008` }) }),
    );
  });

  it('atualiza status do caminhão para "manutencao" quando tipo=corretiva', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxCriar();

    await svc.criar({ ...inputOS, tipo: 'corretiva' });

    expect(tx.caminhao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cam-1' },
        data: { status: 'manutencao' },
      }),
    );
  });

  it('não atualiza status do caminhão quando tipo=preventiva', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxCriar();

    await svc.criar({ ...inputOS, tipo: 'preventiva' });

    expect(tx.caminhao.update).not.toHaveBeenCalled();
  });

  it('reintegra após P2002 e cria com sucesso na segunda tentativa', async () => {
    mockFindFirst.mockResolvedValue(null);
    const p2002 = new PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002', clientVersion: '5.0.0',
    });
    const txOSCreate = jest.fn()
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce({ id: 'os-1', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, ...inputOS });
    const tx = { ordemServico: { create: txOSCreate }, caminhao: { update: jest.fn() } };
    // primeiro $transaction falha (P2002), segundo succeeds
    mockTransaction
      .mockImplementationOnce((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx))
      .mockImplementationOnce((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));

    await svc.criar(inputOS);

    expect(txOSCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── adicionarItem — recálculo de custoTotal ──────────────────────────────────

describe('OrdemServicoService.adicionarItem', () => {
  function makeTxItem(itensExistentes: { quantidade: number; precoUnitario: number }[]) {
    const txItemCreate = jest.fn().mockResolvedValue({
      id: 'item-new', ordemServicoId: 'os-1', material: null,
      ...{ quantidade: 2, precoUnitario: 100 },
    });
    const txItemFindMany = jest.fn().mockResolvedValue(
      [...itensExistentes, { quantidade: 2, precoUnitario: 100 }],
    );
    const txOSUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      itemOS: { create: txItemCreate, findMany: txItemFindMany },
      ordemServico: { update: txOSUpdate },
    };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
    return tx;
  }

  it('cria item e recalcula custoTotal somando todos os itens', async () => {
    // itens pré-existentes: 3×50 = 150; novo item: 2×100 = 200 → total = 350
    const tx = makeTxItem([{ quantidade: 3, precoUnitario: 50 }]);

    await svc.adicionarItem('os-1', { quantidade: 2, precoUnitario: 100, tipo: 'mao_de_obra' });

    expect(tx.itemOS.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ordemServicoId: 'os-1', quantidade: 2, precoUnitario: 100 }),
      }),
    );
    expect(tx.ordemServico.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { custoTotal: 350 } }),
    );
  });

  it('custoTotal = 0 quando não há itens após inserção vazia (edge-case)', async () => {
    // findMany retorna array vazio (mock override)
    const txItemCreate = jest.fn().mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1', material: null, quantidade: 0, precoUnitario: 0 });
    const txItemFindMany = jest.fn().mockResolvedValue([]);
    const txOSUpdate = jest.fn().mockResolvedValue({});
    const tx = { itemOS: { create: txItemCreate, findMany: txItemFindMany }, ordemServico: { update: txOSUpdate } };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));

    await svc.adicionarItem('os-1', { quantidade: 1, precoUnitario: 0, tipo: 'material' });

    expect(tx.ordemServico.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { custoTotal: 0 } }),
    );
  });
});

// ─── removerItem — recálculo de custoTotal ────────────────────────────────────

describe('OrdemServicoService.removerItem', () => {
  it('deleta item e recalcula custoTotal apenas com os restantes', async () => {
    const txItemFind   = jest.fn().mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1', quantidade: 2, precoUnitario: 100 });
    const txItemDelete = jest.fn().mockResolvedValue({});
    // restantes após remoção: 1 item de 3×50 = 150
    const txItemFindMany = jest.fn().mockResolvedValue([{ quantidade: 3, precoUnitario: 50 }]);
    const txOSUpdate     = jest.fn().mockResolvedValue({});
    const tx = {
      itemOS: { findUniqueOrThrow: txItemFind, delete: txItemDelete, findMany: txItemFindMany },
      ordemServico: { update: txOSUpdate },
    };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));

    await svc.removerItem('item-1');

    expect(txItemDelete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    expect(txOSUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { custoTotal: 150 } }),
    );
  });

  it('custoTotal = 0 quando todos os itens foram removidos', async () => {
    const txItemFind   = jest.fn().mockResolvedValue({ id: 'item-1', ordemServicoId: 'os-1', quantidade: 1, precoUnitario: 200 });
    const txItemDelete = jest.fn().mockResolvedValue({});
    const txItemFindMany = jest.fn().mockResolvedValue([]); // sem restantes
    const txOSUpdate     = jest.fn().mockResolvedValue({});
    const tx = {
      itemOS: { findUniqueOrThrow: txItemFind, delete: txItemDelete, findMany: txItemFindMany },
      ordemServico: { update: txOSUpdate },
    };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));

    await svc.removerItem('item-1');

    expect(txOSUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { custoTotal: 0 } }),
    );
  });
});

// ─── atualizar — conversão de dataPrevisao ────────────────────────────────────

describe('OrdemServicoService.atualizar', () => {
  const osRetorno = {
    id: 'os-1', descricao: 'Revisão atualizada', prioridade: 'alta',
    caminhao: {}, responsavel: {}, itens: [],
  };

  beforeEach(() => {
    mockUpdate.mockResolvedValue(osRetorno);
  });

  it('converte dataPrevisao string para Date quando fornecida', async () => {
    await svc.atualizar('os-1', { dataPrevisao: '2026-09-15', prioridade: 'alta' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'os-1' },
        data: expect.objectContaining({ dataPrevisao: expect.any(Date) }),
      }),
    );
  });

  it('dataPrevisao é undefined no payload quando não fornecida', async () => {
    await svc.atualizar('os-1', { descricao: 'Só descrição' });

    const chamada = mockUpdate.mock.calls[0][0];
    // O spread de data não inclui dataPrevisao; a conversão resulta em undefined (campo omitido)
    expect(chamada.data.dataPrevisao).toBeUndefined();
  });

  it('atualiza prioridade e responsavelId sem tocar em dataPrevisao', async () => {
    await svc.atualizar('os-1', { prioridade: 'urgente', responsavelId: 'func-2' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'os-1' },
        data: expect.objectContaining({ prioridade: 'urgente', responsavelId: 'func-2' }),
      }),
    );
  });
});

// ─── listar — construção do where ─────────────────────────────────────────────

describe('OrdemServicoService.listar — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '', orderBy: 'dataAbertura', order: 'desc' as const };
  const osRow = { id: 'os-1', codigo: `OS-${new Date().getFullYear()}-001`, caminhao: null, responsavel: null, itens: [] };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([osRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica status.notIn e dataPrevisao.lt quando atrasadas=true', async () => {
    await svc.listar({ ...paginacao, atrasadas: true });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.status).toMatchObject({ notIn: expect.arrayContaining(['concluida', 'cancelada']) });
    expect(chamada.where.dataPrevisao).toMatchObject({ lt: expect.any(Date) });
  });

  it('aplica status.notIn quando status="aberta" (não usa string literal)', async () => {
    await svc.listar({ ...paginacao, status: 'aberta' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.status).toMatchObject({ notIn: expect.arrayContaining(['concluida', 'cancelada']) });
  });

  it('aplica status direto quando status é outro valor', async () => {
    await svc.listar({ ...paginacao, status: 'em_andamento' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.status).toBe('em_andamento');
  });

  it('aplica caminhaoId e tipo quando fornecidos', async () => {
    await svc.listar({ ...paginacao, caminhaoId: 'cam-1', tipo: 'corretiva' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ caminhaoId: 'cam-1', tipo: 'corretiva' });
  });

  it('aplica dataAbertura.gte quando dataDe fornecido', async () => {
    await svc.listar({ ...paginacao, dataDe: '2026-01-01' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.dataAbertura).toMatchObject({ gte: expect.any(Date) });
  });

  it('aplica OR de busca em codigo, descricao e caminhao aninhado', async () => {
    await svc.listar({ ...paginacao, search: 'revisão' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(3);
    expect(chamada.where.OR[0]).toMatchObject({ codigo: { contains: 'revisão' } });
    expect(chamada.where.OR[1]).toMatchObject({ descricao: { contains: 'revisão' } });
    expect(chamada.where.OR[2]).toMatchObject({ caminhao: { OR: expect.any(Array) } });
  });

  it('retorna ordens e total', async () => {
    const result = await svc.listar(paginacao);

    expect(result.ordens).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
