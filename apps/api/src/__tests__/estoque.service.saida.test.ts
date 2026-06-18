// Testes de registrarSaida e A2 (sugerirOCAutomatica)

jest.mock('../config/database', () => ({
  prisma: {
    estoque: {
      findUnique: jest.fn(),
    },
    itemCompra: {
      findFirst: jest.fn(),
    },
    ordemCompra: {
      findFirst: jest.fn(),
      create:    jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EstoqueService } from '../modules/estoque/estoque.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

const mockTransaction      = prisma.$transaction as jest.Mock;
const mockItemCompra       = prisma.itemCompra.findFirst as jest.Mock;
const mockEstoqueFindUniq  = prisma.estoque.findUnique as jest.Mock;
const mockOCFindFirst      = prisma.ordemCompra.findFirst as jest.Mock;
const mockOCCreate         = prisma.ordemCompra.create as jest.Mock;
const mockWarn             = logger.warn as jest.Mock;

const svc = new EstoqueService();

const matBase = {
  id: 'mat-1', nome: 'Filtro de Óleo', precoUnitario: 25,
  unidadeMedida: 'un', estoqueMinimo: 5, estoqueMaximo: 20, fornecedorId: 'forn-1',
};

function makeTxSaida(opts: {
  quantidadeAtual?: number;
  updateCount?: number;
} = {}) {
  const { quantidadeAtual = 20, updateCount = 1 } = opts;
  const tx = {
    estoque: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        materialId: matBase.id,
        quantidade: quantidadeAtual,
        material: matBase,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
    },
    movimentacao: { create: jest.fn().mockResolvedValue({ id: 'mov-1', tipo: 'saida' }) },
  };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Por padrão A2 não dispara (sem OC existente, mas a criação não é verificada por padrão)
  mockItemCompra.mockResolvedValue(null);
  mockEstoqueFindUniq.mockResolvedValue({ quantidade: 2 });
  mockOCFindFirst.mockResolvedValue(null);
  mockOCCreate.mockResolvedValue({ id: 'oc-auto', codigo: `OC-${new Date().getFullYear()}-001` });
});

// ─── registrarSaida — validação de estoque ───────────────────────────────────

describe('EstoqueService.registrarSaida — validação de estoque', () => {
  it('lança AppError 422 quando estoque insuficiente (updateMany.count=0)', async () => {
    makeTxSaida({ quantidadeAtual: 3, updateCount: 0 });

    const err = await svc.registrarSaida('mat-1', 5, 'uso em OS', 'user-1').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toMatch(/insuficiente/i);
  });

  it('registra saída atomicamente via updateMany quando estoque suficiente', async () => {
    const tx = makeTxSaida({ quantidadeAtual: 20 });

    await svc.registrarSaida('mat-1', 5, 'uso em OS', 'user-1');

    expect(tx.estoque.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ materialId: 'mat-1', quantidade: { gte: 5 } }),
        data: expect.objectContaining({ quantidade: { decrement: 5 } }),
      }),
    );
  });

  it('cria movimentação com tipo=saida e dados corretos', async () => {
    const tx = makeTxSaida({ quantidadeAtual: 20 });

    await svc.registrarSaida('mat-1', 5, 'uso em OS', 'user-1', 'os-123');

    expect(tx.movimentacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialId: 'mat-1',
          tipo: 'saida',
          quantidade: 5,
          motivo: 'uso em OS',
          usuarioId: 'user-1',
          ordemServicoId: 'os-123',
          precoUnitario: matBase.precoUnitario,
        }),
      }),
    );
  });

  it('emite logger.warn quando novaQuantidade cai abaixo do mínimo', async () => {
    // quantidade=6, saída=4 → novaQuantidade=2 < estoqueMinimo=5
    makeTxSaida({ quantidadeAtual: 6 });

    await svc.registrarSaida('mat-1', 4, 'uso', 'user-1');

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('abaixo do mínimo'),
    );
  });

  it('NÃO emite logger.warn quando novaQuantidade >= estoqueMinimo', async () => {
    // quantidade=20, saída=5 → novaQuantidade=15 >= estoqueMinimo=5
    makeTxSaida({ quantidadeAtual: 20 });

    await svc.registrarSaida('mat-1', 5, 'uso', 'user-1');

    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('retorna resultado com abaixoMinimo=true quando adequado', async () => {
    makeTxSaida({ quantidadeAtual: 6 });

    const result = await svc.registrarSaida('mat-1', 4, 'uso', 'user-1') as { abaixoMinimo: boolean };

    expect(result.abaixoMinimo).toBe(true);
  });

  it('retorna resultado com abaixoMinimo=false quando adequado', async () => {
    makeTxSaida({ quantidadeAtual: 20 });

    const result = await svc.registrarSaida('mat-1', 5, 'uso', 'user-1') as { abaixoMinimo: boolean };

    expect(result.abaixoMinimo).toBe(false);
  });
});

// ─── A2 — sugerirOCAutomatica ─────────────────────────────────────────────────

describe('EstoqueService.registrarSaida — A2 (sugerirOCAutomatica)', () => {
  it('A2 — cria OC automática quando abaixo do mínimo e sem OC ativa', async () => {
    makeTxSaida({ quantidadeAtual: 6 }); // novaQtd=2 < min=5 → abaixoMinimo

    await svc.registrarSaida('mat-1', 4, 'uso', 'user-1');

    expect(mockItemCompra).toHaveBeenCalled();  // verificou OC existente
    expect(mockOCCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fornecedorId: matBase.fornecedorId,
          observacoes: expect.stringContaining('automaticamente'),
        }),
      }),
    );
  });

  it('A2 — NÃO cria OC quando já existe OC pendente/aprovada para o material', async () => {
    makeTxSaida({ quantidadeAtual: 6 }); // novaQtd=2 < min=5
    mockItemCompra.mockResolvedValue({ id: 'item-1' }); // OC ativa encontrada

    await svc.registrarSaida('mat-1', 4, 'uso', 'user-1');

    expect(mockOCCreate).not.toHaveBeenCalled();
  });

  it('A2 — NÃO chama sugerirOCAutomatica quando estoque acima do mínimo', async () => {
    makeTxSaida({ quantidadeAtual: 20 }); // novaQtd=15 >= min=5

    await svc.registrarSaida('mat-1', 5, 'uso', 'user-1');

    expect(mockItemCompra).not.toHaveBeenCalled();
    expect(mockOCCreate).not.toHaveBeenCalled();
  });

  it('A2 — não propaga erro se criação de OC falhar', async () => {
    makeTxSaida({ quantidadeAtual: 6 });
    mockOCCreate.mockRejectedValue(new Error('DB timeout'));

    // Deve retornar normalmente sem lançar erro
    const result = await svc.registrarSaida('mat-1', 4, 'uso', 'user-1');
    expect(result).toBeDefined();
  });
});
