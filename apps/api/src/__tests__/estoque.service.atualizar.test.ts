// Testes para EstoqueService.buscarMaterial e EstoqueService.atualizarMaterial
// Arquivo separado porque o mock de estoque.service.test.ts não inclui
// material.findUniqueOrThrow nem material.update.

jest.mock('../config/database', () => ({
  prisma: {
    material: {
      findUniqueOrThrow: jest.fn(),
      update:            jest.fn(),
    },
    categoria: {
      update: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EstoqueService } from '../modules/estoque/estoque.service';
import { prisma } from '../config/database';

const mockFindUniqueOrThrow = prisma.material.findUniqueOrThrow as jest.Mock;
const mockUpdate            = prisma.material.update as jest.Mock;

const svc = new EstoqueService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── buscarMaterial ──────────────────────────────────────────────────────────

describe('EstoqueService.buscarMaterial', () => {
  const materialFixture = {
    id: 'mat-1',
    codigo: 'MAT-001',
    nome: 'Filtro de ar',
    ativo: true,
    categoria: { id: 'cat-1', nome: 'Filtros' },
    fornecedor: { id: 'forn-1', razaoSocial: 'Auto Parts LTDA' },
    estoques: [{ quantidade: 10, localizacao: 'Prateleira A' }],
    movimentacoes: [],
  };

  it('retorna material com categoria, fornecedor, estoques e movimentacoes', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(materialFixture);
    const result = await svc.buscarMaterial('mat-1');
    expect(result.id).toBe('mat-1');
    expect(result.categoria).toBeDefined();
    expect(result.estoques).toHaveLength(1);
  });

  it('propaga P2025 quando material não existe', async () => {
    const notFound = new Error('Not found') as Error & { code?: string };
    notFound.code = 'P2025';
    mockFindUniqueOrThrow.mockRejectedValue(notFound);
    await expect(svc.buscarMaterial('inexistente')).rejects.toMatchObject({ code: 'P2025' });
  });
});

// ─── atualizarMaterial ───────────────────────────────────────────────────────

describe('EstoqueService.atualizarMaterial', () => {
  const matRetorno = {
    id: 'mat-1', codigo: 'MAT-001', nome: 'Filtro de ar', ativo: true,
    categoria: { id: 'cat-1', nome: 'Filtros' },
    fornecedor: { id: 'forn-1', razaoSocial: 'Auto Parts' },
    estoques: [{ quantidade: 10 }],
  };

  it('atualiza campos parciais e retorna material com relations', async () => {
    mockUpdate.mockResolvedValue({ ...matRetorno, nome: 'Filtro de combustível' });

    const result = await svc.atualizarMaterial('mat-1', { nome: 'Filtro de combustível' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mat-1' },
        data: { nome: 'Filtro de combustível' },
        include: expect.objectContaining({ categoria: true, fornecedor: true }),
      }),
    );
    expect(result.nome).toBe('Filtro de combustível');
  });

  it('desativa material quando ativo=false é passado', async () => {
    mockUpdate.mockResolvedValue({ ...matRetorno, ativo: false });

    await svc.atualizarMaterial('mat-1', { ativo: false });

    const chamada = mockUpdate.mock.calls[0][0];
    expect(chamada.data).toHaveProperty('ativo', false);
  });

  it('atualiza estoqueMinimo e estoqueMaximo ao mesmo tempo', async () => {
    mockUpdate.mockResolvedValue({ ...matRetorno, estoqueMinimo: 5, estoqueMaximo: 30 });

    await svc.atualizarMaterial('mat-1', { estoqueMinimo: 5, estoqueMaximo: 30 });

    const chamada = mockUpdate.mock.calls[0][0];
    expect(chamada.data.estoqueMinimo).toBe(5);
    expect(chamada.data.estoqueMaximo).toBe(30);
  });
});
