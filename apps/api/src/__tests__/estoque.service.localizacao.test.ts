// Testes de atualizarLocalizacao (lógica de upsert)

jest.mock('../config/database', () => ({
  prisma: {
    estoque: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EstoqueService } from '../modules/estoque/estoque.service';
import { prisma } from '../config/database';

const mockFindUnique = prisma.estoque.findUnique as jest.Mock;
const mockCreate     = prisma.estoque.create as jest.Mock;
const mockUpdate     = prisma.estoque.update as jest.Mock;

const svc = new EstoqueService();

beforeEach(() => { jest.clearAllMocks(); });

describe('EstoqueService.atualizarLocalizacao', () => {
  it('cria registro de estoque com quantidade=0 quando não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'est-1' });

    const result = await svc.atualizarLocalizacao('mat-1', 'Prateleira A3');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialId: 'mat-1',
          quantidade: 0,
          localizacao: 'Prateleira A3',
        }),
      }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ materialId: 'mat-1', localizacao: 'Prateleira A3' });
  });

  it('atualiza localizacao quando registro de estoque já existe', async () => {
    mockFindUnique.mockResolvedValue({ id: 'est-1', materialId: 'mat-1', quantidade: 10 });
    mockUpdate.mockResolvedValue({});

    await svc.atualizarLocalizacao('mat-1', 'Galpão B2');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { materialId: 'mat-1' },
        data: { localizacao: 'Galpão B2' },
      }),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('aceita localizacao=null para limpar o campo', async () => {
    mockFindUnique.mockResolvedValue({ id: 'est-1', materialId: 'mat-1' });
    mockUpdate.mockResolvedValue({});

    const result = await svc.atualizarLocalizacao('mat-1', null);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { localizacao: null } }),
    );
    expect(result).toEqual({ materialId: 'mat-1', localizacao: null });
  });
});
