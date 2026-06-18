// Testes de criarMaterial — geração de código + estoque inicial

jest.mock('../config/database', () => ({
  prisma: {
    material: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EstoqueService } from '../modules/estoque/estoque.service';
import { prisma } from '../config/database';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst   = prisma.material.findFirst as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const svc = new EstoqueService();

const inputBase = {
  nome: 'Filtro de Óleo',
  categoriaId: '00000000-0000-0000-0000-000000000001',
  unidadeMedida: 'un',
  precoUnitario: 25,
  estoqueMinimo: 5,
  estoqueMaximo: 20,
  fornecedorId: '00000000-0000-0000-0000-000000000002',
};

function makeTxCriar() {
  const txMatCreate    = jest.fn().mockResolvedValue({ id: 'mat-1', codigo: 'MAT-001', ...inputBase });
  const txEstoqueCreate = jest.fn().mockResolvedValue({ id: 'est-1' });
  const tx = {
    material: { create: txMatCreate },
    estoque:  { create: txEstoqueCreate },
  };
  mockTransaction.mockImplementation((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx));
  return tx;
}

beforeEach(() => { jest.clearAllMocks(); });

// ─── criarMaterial — geração de código ────────────────────────────────────────

describe('EstoqueService.criarMaterial — geração de código', () => {
  it('gera MAT-001 quando não há materiais cadastrados', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxCriar();

    await svc.criarMaterial(inputBase);

    expect(tx.material.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'MAT-001' }) }),
    );
  });

  it('incrementa código a partir do último (MAT-005 → MAT-006)', async () => {
    mockFindFirst.mockResolvedValue({ codigo: 'MAT-005' });
    const tx = makeTxCriar();
    tx.material.create.mockResolvedValue({ id: 'mat-6', codigo: 'MAT-006', ...inputBase });

    await svc.criarMaterial(inputBase);

    expect(tx.material.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'MAT-006' }) }),
    );
  });

  it('cria registro de estoque com quantidade=0 junto com o material', async () => {
    mockFindFirst.mockResolvedValue(null);
    const tx = makeTxCriar();

    await svc.criarMaterial(inputBase);

    expect(tx.estoque.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ materialId: 'mat-1', quantidade: 0 }),
      }),
    );
  });

  it('retorna o material criado com dados corretos', async () => {
    mockFindFirst.mockResolvedValue(null);
    makeTxCriar();

    const result = await svc.criarMaterial(inputBase);

    expect(result).toMatchObject({ id: 'mat-1', codigo: 'MAT-001', nome: inputBase.nome });
  });

  it('retry em P2002 no campo codigo e cria na segunda tentativa', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)               // tentativa 0 — último código
      .mockResolvedValueOnce({ codigo: 'MAT-001' }); // tentativa 1 — reavaliar

    const p2002 = new PrismaClientKnownRequestError('Unique', {
      code: 'P2002', clientVersion: '5.0',
    });
    const txCreate1 = jest.fn().mockRejectedValueOnce(p2002);
    const txCreate2 = jest.fn().mockResolvedValue({ id: 'mat-2', codigo: 'MAT-002', ...inputBase });
    const txEstoqueCreate = jest.fn().mockResolvedValue({});

    mockTransaction
      .mockImplementationOnce((fn: (tx: object) => Promise<unknown>) =>
        fn({ material: { create: txCreate1 }, estoque: { create: txEstoqueCreate } }),
      )
      .mockImplementationOnce((fn: (tx: object) => Promise<unknown>) =>
        fn({ material: { create: txCreate2 }, estoque: { create: txEstoqueCreate } }),
      );

    const result = await svc.criarMaterial(inputBase);

    expect(txCreate2).toHaveBeenCalled();
    expect(result.codigo).toBe('MAT-002');
  });
});