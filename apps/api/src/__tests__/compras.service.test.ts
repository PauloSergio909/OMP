jest.mock('../config/database', () => ({
  prisma: {
    ordemCompra: {
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
  logger: { info: jest.fn(), error: jest.fn() },
}));

import { ComprasService } from '../modules/compras/compras.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst         = prisma.ordemCompra.findFirst as jest.Mock;
const mockFindMany          = prisma.ordemCompra.findMany as jest.Mock;
const mockFindUniqueOrThrow = prisma.ordemCompra.findUniqueOrThrow as jest.Mock;
const mockCreate            = prisma.ordemCompra.create as jest.Mock;
const mockTransaction       = prisma.$transaction as jest.Mock;
const mockCount             = prisma.ordemCompra.count as jest.Mock;
const mockAggregate         = prisma.ordemCompra.aggregate as jest.Mock;

const svc = new ComprasService();

const ocBase = {
  id: 'oc-1',
  codigo: 'OC-001',
  status: 'aprovada',
  itens: [
    { materialId: 'mat-1', quantidade: 10, precoUnitario: 50.0 },
    { materialId: 'mat-2', quantidade: 5, precoUnitario: 120.0 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ComprasService.atualizarStatus — transições inválidas', () => {
  it('lança erro em transição proibida (recebida → cancelada)', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ ...ocBase, status: 'recebida' });
    await expect(svc.atualizarStatus('oc-1', 'cancelada', 'user-1')).rejects.toThrow('Transição inválida');
  });

  it('lança erro em pulo de status (pendente → recebida)', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ ...ocBase, status: 'pendente' });
    await expect(svc.atualizarStatus('oc-1', 'recebida', 'user-1')).rejects.toThrow('Transição inválida');
  });
});

describe('ComprasService.atualizarStatus — aprovação (sem alteração de estoque)', () => {
  it('não aciona upsert de estoque ao aprovar', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ ...ocBase, status: 'pendente' });

    const txFns: jest.Mock[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        ordemCompra: { update: jest.fn().mockResolvedValue({ ...ocBase, status: 'aprovada' }) },
        estoque: { upsert: jest.fn() },
        movimentacao: { create: jest.fn() },
        material: { update: jest.fn() },
      };
      txFns.push(tx.estoque.upsert as jest.Mock);
      return fn(tx);
    });

    await svc.atualizarStatus('oc-1', 'aprovada', 'user-1');
    expect(txFns[0]).not.toHaveBeenCalled();
  });
});

describe('ComprasService.atualizarStatus — recebimento com auto-entrada em estoque', () => {
  let txEstoqueUpsert: jest.Mock;
  let txMovimentacaoCreate: jest.Mock;
  let txMaterialUpdate: jest.Mock;

  beforeEach(async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocBase);

    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        ordemCompra: { update: jest.fn().mockResolvedValue({ ...ocBase, status: 'recebida' }) },
        estoque: { upsert: jest.fn().mockResolvedValue({}) },
        movimentacao: { create: jest.fn().mockResolvedValue({}) },
        material: { update: jest.fn().mockResolvedValue({}) },
      };
      txEstoqueUpsert = tx.estoque.upsert as jest.Mock;
      txMovimentacaoCreate = tx.movimentacao.create as jest.Mock;
      txMaterialUpdate = tx.material.update as jest.Mock;
      return fn(tx);
    });

    await svc.atualizarStatus('oc-1', 'recebida', 'user-1');
  });

  it('faz upsert de estoque para cada item', () => {
    expect(txEstoqueUpsert).toHaveBeenCalledTimes(2);
    expect(txEstoqueUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { materialId: 'mat-1' },
        update: expect.objectContaining({ quantidade: { increment: 10 } }),
        create: expect.objectContaining({ materialId: 'mat-1', quantidade: 10 }),
      }),
    );
  });

  it('cria movimentação de entrada para cada item', () => {
    expect(txMovimentacaoCreate).toHaveBeenCalledTimes(2);
    expect(txMovimentacaoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialId: 'mat-1',
          tipo: 'entrada',
          quantidade: 10,
          precoUnitario: 50.0,
          usuarioId: 'user-1',
        }),
      }),
    );
  });

  it('atualiza precoUnitario do material para cada item', () => {
    expect(txMaterialUpdate).toHaveBeenCalledTimes(2);
    expect(txMaterialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mat-1' },
        data: { precoUnitario: 50.0 },
      }),
    );
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('ComprasService.getKPIs', () => {
  // getKPIs usa Promise.all com 5 count + 1 aggregate
  function setupKPIs(pendentes: number, aprovadas: number, recebidas: number, canceladas: number, atrasadas: number, valorEmAberto: number | null) {
    mockCount
      .mockResolvedValueOnce(pendentes)
      .mockResolvedValueOnce(aprovadas)
      .mockResolvedValueOnce(recebidas)
      .mockResolvedValueOnce(canceladas)
      .mockResolvedValueOnce(atrasadas);
    mockAggregate.mockResolvedValueOnce({ _sum: { valorTotal: valorEmAberto } });
  }

  it('retorna todos os campos incluindo atrasadas', async () => {
    setupKPIs(3, 2, 10, 1, 1, 7500);

    const result = await svc.getKPIs();

    expect(result).toEqual({
      pendentes: 3,
      aprovadas: 2,
      recebidas: 10,
      canceladas: 1,
      atrasadas: 1,
      valorEmAberto: 7500,
    });
  });

  it('retorna valorEmAberto=0 quando aggregate retorna null', async () => {
    setupKPIs(0, 0, 0, 0, 0, null);

    const result = await svc.getKPIs();

    expect(result.valorEmAberto).toBe(0);
  });

  it('retorna atrasadas=0 quando todas as OCs estão dentro do prazo', async () => {
    setupKPIs(5, 3, 12, 2, 0, 15000);

    const result = await svc.getKPIs();

    expect(result.atrasadas).toBe(0);
  });

  it('conta atrasadas apenas entre pendentes e aprovadas (status não terminal)', async () => {
    setupKPIs(2, 1, 5, 1, 2, 3000);

    await svc.getKPIs();

    // A 5ª chamada ao count deve excluir status 'recebida' e 'cancelada'
    const chamadaAtrasadas = mockCount.mock.calls[4][0];
    expect(chamadaAtrasadas.where.status).toMatchObject({ notIn: expect.arrayContaining(['recebida', 'cancelada']) });
    expect(chamadaAtrasadas.where.dataEntrega).toMatchObject({ lt: expect.any(Date) });
  });
});

// ─── criar — geração de código e cálculo de valorTotal ───────────────────────

const ano = new Date().getFullYear();

const inputCompra = {
  fornecedorId: 'forn-1',
  dataEntrega: '2026-07-31',
  itens: [
    { materialId: 'mat-1', quantidade: 10, precoUnitario: 50.0 },
    { materialId: 'mat-2', quantidade: 5,  precoUnitario: 120.0 },
  ],
};

const ocCriada = {
  id: 'oc-new',
  codigo: `OC-${ano}-001`,
  fornecedor: { razaoSocial: 'Fornecedor X' },
  itens: [],
};

describe('ComprasService.criar — geração de código', () => {
  it(`gera OC-${ano}-001 quando não há OC anterior`, async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(ocCriada);

    await svc.criar(inputCompra);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: `OC-${ano}-001` }) }),
    );
  });

  it(`incrementa a partir da última OC (OC-${ano}-004 → OC-${ano}-005)`, async () => {
    mockFindFirst.mockResolvedValue({ codigo: `OC-${ano}-004` });
    mockCreate.mockResolvedValue({ ...ocCriada, codigo: `OC-${ano}-005` });

    await svc.criar(inputCompra);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: `OC-${ano}-005` }) }),
    );
  });

  it('calcula valorTotal correto (10×50 + 5×120 = 1100)', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(ocCriada);

    await svc.criar(inputCompra);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ valorTotal: 1100 }) }),
    );
  });

  it('converte dataEntrega string para Date', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(ocCriada);

    await svc.criar(inputCompra);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dataEntrega: expect.any(Date) }),
      }),
    );
  });

  it('reintegra após P2002 e cria com sucesso na segunda tentativa', async () => {
    mockFindFirst.mockResolvedValue(null);
    const p2002 = new PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002', clientVersion: '5.0.0',
    });
    mockCreate
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce(ocCriada);

    await svc.criar(inputCompra);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── listar — construção do where ─────────────────────────────────────────────

describe('ComprasService.listar — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '' };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it('aplica status quando fornecido (sem atrasada)', async () => {
    await svc.listar({ ...paginacao, status: 'pendente' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ status: 'pendente' });
  });

  it('aplica dataEntrega.lt e status.notIn quando atrasada=true (ignora status manual)', async () => {
    await svc.listar({ ...paginacao, atrasada: true, status: 'aprovada' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.dataEntrega).toMatchObject({ lt: expect.any(Date) });
    expect(chamada.where.status).toMatchObject({
      notIn: expect.arrayContaining(['recebida', 'cancelada']),
    });
  });

  it('aplica OR de busca em código e fornecedor.razaoSocial', async () => {
    await svc.listar({ ...paginacao, search: 'parafuso' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(2);
    expect(chamada.where.OR[0]).toMatchObject({ codigo: { contains: 'parafuso' } });
    expect(chamada.where.OR[1]).toMatchObject({
      fornecedor: { razaoSocial: { contains: 'parafuso' } },
    });
  });

  it('retorna compras e total', async () => {
    mockFindMany.mockResolvedValue([ocBase]);
    mockCount.mockResolvedValue(1);

    const result = await svc.listar(paginacao);

    expect(result.compras).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── atualizar (sessão 14-15) ──────────────────────────────────────────────────

describe('ComprasService.atualizar', () => {
  const ocPendente  = { ...ocBase, status: 'pendente' };
  const ocAprovada  = { ...ocBase, status: 'aprovada' };
  const ocRetorno   = { ...ocPendente, fornecedor: {}, itens: [] };

  beforeEach(() => {
    (prisma.ordemCompra.update as jest.Mock).mockResolvedValue(ocRetorno);
  });

  it('lança AppError 422 quando OC não está pendente', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocAprovada);

    const err = await svc.atualizar('oc-1', { observacoes: 'Urgente' }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toMatch(/pendentes/i);
  });

  it('converte dataEntrega string para Date', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocPendente);

    await svc.atualizar('oc-1', { dataEntrega: '2026-12-31' });

    expect(prisma.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dataEntrega: expect.any(Date) }),
      }),
    );
  });

  it('aceita dataEntrega=null para limpar a data (sessão 34)', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocPendente);

    await svc.atualizar('oc-1', { dataEntrega: null });

    expect(prisma.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dataEntrega: null }),
      }),
    );
  });

  it('inclui apenas campos explicitamente passados via hasOwnProperty', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocPendente);

    // Só passa observacoes, sem dataEntrega
    await svc.atualizar('oc-1', { observacoes: 'Nota de compra' });

    const chamada = (prisma.ordemCompra.update as jest.Mock).mock.calls[0][0];
    expect(chamada.data).toHaveProperty('observacoes', 'Nota de compra');
    expect(chamada.data).not.toHaveProperty('dataEntrega'); // não foi passado
  });
});

// ─── buscar ───────────────────────────────────────────────────────────────────

describe('ComprasService.buscar', () => {
  const ocDetalhe = { ...ocBase, status: 'pendente', fornecedor: { id: 'forn-1', razaoSocial: 'Forn LTDA' }, itens: [] };

  it('retorna OC com fornecedor e itens quando encontrada', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(ocDetalhe);
    const result = await svc.buscar('oc-1');
    expect(result.codigo).toBe('OC-001');
    expect(result.fornecedor).toBeDefined();
    expect(result.itens).toEqual([]);
  });

  it('propaga P2025 quando OC não existe', async () => {
    const notFound = new Error('Not found') as Error & { code?: string };
    notFound.code = 'P2025';
    mockFindUniqueOrThrow.mockRejectedValue(notFound);
    await expect(svc.buscar('inexistente')).rejects.toMatchObject({ code: 'P2025' });
  });
});

// ─── adicionarItem ────────────────────────────────────────────────────────────

describe('ComprasService.adicionarItem', () => {
  function makeTx(statusOC: string, itensExistentes: { quantidade: number; precoUnitario: number }[] = []) {
    const txOCFind  = jest.fn().mockResolvedValue({ status: statusOC });
    const txICCreate = jest.fn().mockResolvedValue({
      id: 'item-new', ordemCompraId: 'oc-1', materialId: 'mat-1', quantidade: 2, precoUnitario: 50,
      material: { id: 'mat-1', nome: 'Óleo', codigo: 'MAT-001', unidadeMedida: 'L' },
    });
    const txICFindMany = jest.fn().mockResolvedValue([
      ...itensExistentes,
      { quantidade: 2, precoUnitario: 50 },
    ]);
    const txOCUpdate = jest.fn().mockResolvedValue({});
    const tx = {
      ordemCompra: { findUniqueOrThrow: txOCFind, update: txOCUpdate },
      itemCompra:  { create: txICCreate, findMany: txICFindMany },
    };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
    return tx;
  }

  it('lança AppError 422 quando OC não está pendente', async () => {
    makeTx('aprovada');
    await expect(svc.adicionarItem('oc-1', { materialId: 'mat-1', quantidade: 2, precoUnitario: 50 }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('cria item e recalcula valorTotal somando todos os itens', async () => {
    // pré-existentes: 3×100 = 300; novo: 2×50 = 100 → total 400
    const tx = makeTx('pendente', [{ quantidade: 3, precoUnitario: 100 }]);

    await svc.adicionarItem('oc-1', { materialId: 'mat-1', quantidade: 2, precoUnitario: 50 });

    expect(tx.itemCompra.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ordemCompraId: 'oc-1' }) }),
    );
    expect(tx.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { valorTotal: 400 } }),
    );
  });

  it('valorTotal = item único quando OC não tinha itens antes', async () => {
    const tx = makeTx('pendente'); // sem itens pré-existentes
    // findMany retorna só o novo: [{quantidade:2, precoUnitario:50}]
    tx.itemCompra.findMany.mockResolvedValue([{ quantidade: 2, precoUnitario: 50 }]);

    await svc.adicionarItem('oc-1', { materialId: 'mat-1', quantidade: 2, precoUnitario: 50 });

    expect(tx.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { valorTotal: 100 } }),
    );
  });
});

// ─── removerItem ──────────────────────────────────────────────────────────────

describe('ComprasService.removerItem', () => {
  function makeTxRemover(statusOC: string, restantes: { quantidade: number; precoUnitario: number }[] = []) {
    const txICFind       = jest.fn().mockResolvedValue({ ordemCompraId: 'oc-1' });
    const txOCFind       = jest.fn().mockResolvedValue({ status: statusOC });
    const txICDelete     = jest.fn().mockResolvedValue({});
    const txICFindMany   = jest.fn().mockResolvedValue(restantes);
    const txOCUpdate     = jest.fn().mockResolvedValue({});
    const tx = {
      ordemCompra: { findUniqueOrThrow: txOCFind, update: txOCUpdate },
      itemCompra:  { findUniqueOrThrow: txICFind, delete: txICDelete, findMany: txICFindMany },
    };
    mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
    return tx;
  }

  it('lança AppError 422 quando OC não está pendente', async () => {
    makeTxRemover('aprovada');
    await expect(svc.removerItem('item-1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('deleta item e recalcula valorTotal com os restantes', async () => {
    // restantes após remoção: 2×80 = 160
    const tx = makeTxRemover('pendente', [{ quantidade: 2, precoUnitario: 80 }]);

    await svc.removerItem('item-1');

    expect(tx.itemCompra.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    expect(tx.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { valorTotal: 160 } }),
    );
  });

  it('valorTotal = 0 quando todos os itens foram removidos', async () => {
    const tx = makeTxRemover('pendente', []); // sem restantes

    await svc.removerItem('item-1');

    expect(tx.ordemCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { valorTotal: 0 } }),
    );
  });
});
