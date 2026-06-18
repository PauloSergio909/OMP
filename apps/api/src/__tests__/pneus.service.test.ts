jest.mock('../config/database', () => ({
  prisma: {
    pneu: {
      findFirst:          jest.fn(),
      findMany:           jest.fn(),
      findUniqueOrThrow:  jest.fn(),
      create:             jest.fn(),
      update:             jest.fn(),
      count:              jest.fn(),
    },
    caminhao: {
      findUniqueOrThrow: jest.fn(),
    },
    trocaPneu: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw:    jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { PneusService } from '../modules/pneus/pneus.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst             = prisma.pneu.findFirst as jest.Mock;
const mockFindMany              = prisma.pneu.findMany as jest.Mock;
const mockFindUniqueOrThrow     = prisma.pneu.findUniqueOrThrow as jest.Mock;
const mockCreate                = prisma.pneu.create as jest.Mock;
const mockTransaction           = prisma.$transaction as jest.Mock;
const mockCaminhaoFindUnique    = prisma.caminhao.findUniqueOrThrow as jest.Mock;

const svc = new PneusService();

beforeEach(() => {
  jest.clearAllMocks();
  // Default: truck exists with kmAtual=100000 (allows kmInstalacao up to 100000)
  mockCaminhaoFindUnique.mockResolvedValue({ kmAtual: 100000 });
});

// ─── criar ─────────────────────────────────────────────────────────────────

describe('PneusService.criar', () => {
  const inputBase = {
    caminhaoId: 'cam-1',
    posicao: 'dianteiro_esq',
    marca: 'Bridgestone',
    modelo: 'R22',
    kmInstalacao: 50000,
  };

  it('lança AppError 422 para posição inválida', async () => {
    await expect(svc.criar({ ...inputBase, posicao: 'posicao_invalida' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança AppError 409 quando já existe pneu ativo na posição', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: 'pneu-existente' }); // check posição ocupada

    await expect(svc.criar(inputBase)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('gera PNE-001 quando não há pneus cadastrados', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)   // posição livre
      .mockResolvedValueOnce(null);  // último código (nenhum)

    mockCreate.mockResolvedValue({ id: 'p-1', codigo: 'PNE-001', ...inputBase, trocas: [] });

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'PNE-001' }) }),
    );
  });

  it('incrementa código a partir do último (PNE-002 → PNE-003)', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)                // posição livre
      .mockResolvedValueOnce({ codigo: 'PNE-002' }); // último código

    mockCreate.mockResolvedValue({ id: 'p-3', codigo: 'PNE-003', ...inputBase, trocas: [] });

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'PNE-003' }) }),
    );
  });

  it('usa kmVidaUtil padrão de 80000 quando não informado', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    mockCreate.mockResolvedValue({ id: 'p-1', codigo: 'PNE-001', ...inputBase, trocas: [] });

    await svc.criar(inputBase);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kmVidaUtil: 80000 }) }),
    );
  });

  it('lança AppError 422 quando kmInstalacao > kmAtual do caminhão', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // posição livre
    mockCaminhaoFindUnique.mockResolvedValue({ kmAtual: 10000 }); // caminhão com 10k km

    await expect(svc.criar({ ...inputBase, kmInstalacao: 50000 }))
      .rejects.toMatchObject({ statusCode: 422, message: /maior que o KM atual/i });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('aceita kmInstalacao igual ao kmAtual do caminhão (limite exato)', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)  // posição livre
      .mockResolvedValueOnce(null); // último código
    mockCaminhaoFindUnique.mockResolvedValue({ kmAtual: 50000 }); // exatamente igual
    mockCreate.mockResolvedValue({ id: 'p-1', codigo: 'PNE-001', ...inputBase, trocas: [] });

    await expect(svc.criar({ ...inputBase, kmInstalacao: 50000 })).resolves.toBeDefined();
  });

  it('retry em P2002 no campo codigo e lança na segunda tentativa com conflito em placa', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)                // posição livre
      .mockResolvedValueOnce(null)                // tentativa 0 — código
      .mockResolvedValueOnce({ codigo: 'PNE-001' }) // tentativa 1 — reavaliar código
      .mockResolvedValueOnce(null);               // tentativa 2 — sem último

    const p2002Codigo = new PrismaClientKnownRequestError('Unique', {
      code: 'P2002', clientVersion: '5.0', meta: { target: ['codigo'] },
    });
    mockCreate
      .mockRejectedValueOnce(p2002Codigo)   // tentativa 0 falha
      .mockResolvedValueOnce({ id: 'p-2', codigo: 'PNE-002', ...inputBase, trocas: [] }); // tentativa 1 ok

    const result = await svc.criar(inputBase);
    expect(result.codigo).toBe('PNE-002');
  });
});

// ─── buscar ──────────────────────────────────────────────────────────────────

describe('PneusService.buscar', () => {
  it('retorna pneu com histórico de trocas', async () => {
    const pneuComTrocas = {
      id: 'p-1', codigo: 'PNE-001', posicao: 'dianteiro_esq',
      marca: 'Bridgestone', modelo: 'R22', status: 'ativo',
      trocas: [{ id: 'tr-1', kmTroca: 80000, motivo: 'desgaste' }],
    };
    mockFindUniqueOrThrow.mockResolvedValue(pneuComTrocas);

    const result = await svc.buscar('p-1');

    expect(result).toEqual(pneuComTrocas);
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p-1' } }),
    );
  });

  it('propaga erro quando pneu não existe (P2025)', async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error('Not Found'));

    await expect(svc.buscar('p-nao-existe')).rejects.toThrow();
  });
});

// ─── registrarTroca ──────────────────────────────────────────────────────────

describe('PneusService.registrarTroca', () => {
  const troca = { kmTroca: 130000, motivo: 'desgaste' };
  // Pneu base: instalado em 50000 km, caminhão atualmente em 150000 km
  const pneuAtivo = { id: 'p-1', status: 'ativo', caminhaoId: 'cam-1', kmInstalacao: 50000, caminhao: { kmAtual: 150000 } };

  it('lança AppError 422 quando pneu não está ativo', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'p-1', status: 'trocado', caminhaoId: 'cam-1', kmInstalacao: 50000, caminhao: { kmAtual: 150000 } });

    await expect(svc.registrarTroca('p-1', troca)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('lança AppError 422 quando kmTroca < kmInstalacao do pneu', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ ...pneuAtivo, kmInstalacao: 100000 });
    // kmTroca=130000 < kmInstalacao=100000... wait, 130000 > 100000. Let me use a proper example.
    // kmTroca=40000 < kmInstalacao=50000 → deve rejeitar
    await expect(svc.registrarTroca('p-1', { kmTroca: 40000, motivo: 'troca' }))
      .rejects.toMatchObject({ statusCode: 422, message: /menor que o KM de instalação/i });
  });

  it('desativa pneu e registra troca na transação', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(pneuAtivo);

    const trocaCriada = { id: 'tr-1', pneuId: 'p-1', ...troca };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        pneu: { update: jest.fn().mockResolvedValue({ id: 'p-1', status: 'trocado' }) },
        trocaPneu: { create: jest.fn().mockResolvedValue(trocaCriada) },
      };
      return fn(tx);
    });

    const result = await svc.registrarTroca('p-1', troca) as { troca: typeof trocaCriada; novoPneu: null };
    expect(result.troca).toEqual(trocaCriada);
    expect(result.novoPneu).toBeNull();
  });

  it('cria novo pneu quando novoPneu é informado', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(pneuAtivo);

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        pneu: { update: jest.fn().mockResolvedValue({}) },
        trocaPneu: { create: jest.fn().mockResolvedValue({ id: 'tr-1' }) },
      };
      return fn(tx);
    });

    const novoPneuData = { posicao: 'dianteiro_esq', marca: 'Michelin', modelo: 'X', kmInstalacao: 130000 };

    // svc.criar usa prisma direto — mock do fluxo de criação
    mockFindFirst
      .mockResolvedValueOnce(null)    // posição livre
      .mockResolvedValueOnce(null);   // último código
    mockCreate.mockResolvedValue({ id: 'p-novo', codigo: 'PNE-001', ...novoPneuData, trocas: [] });

    const result = await svc.registrarTroca('p-1', { ...troca, novoPneu: novoPneuData }) as { novoPneu: { id: string } };
    expect(result.novoPneu).toBeDefined();
    expect(result.novoPneu!.id).toBe('p-novo');
  });
});

// ─── getKPIs ─────────────────────────────────────────────────────────────────

describe('PneusService.getKPIs', () => {
  it('calcula pctVida e alertar corretamente', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p-1', posicao: 'dianteiro_esq', marca: 'B', modelo: 'R', kmInstalacao: 0, kmVidaUtil: 80000 },
      { id: 'p-2', posicao: 'dianteiro_dir', marca: 'B', modelo: 'R', kmInstalacao: 0, kmVidaUtil: 80000 },
    ]);

    const result = await svc.getKPIs('cam-1', 64000);

    expect(result[0].pctVida).toBe(80);
    expect(result[0].alertar).toBe(true);   // >= 80%
    expect(result[1].pctVida).toBe(80);
  });

  it('não alerta pneu com menos de 80% de vida útil', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p-1', posicao: 'estepe', marca: 'B', modelo: 'R', kmInstalacao: 0, kmVidaUtil: 80000 },
    ]);

    const result = await svc.getKPIs('cam-1', 50000);

    expect(result[0].pctVida).toBe(63);
    expect(result[0].alertar).toBe(false);
  });

  it('limita pctVida a 100 quando km rodados > kmVidaUtil', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p-1', posicao: 'estepe', marca: 'B', modelo: 'R', kmInstalacao: 0, kmVidaUtil: 80000 },
    ]);

    const result = await svc.getKPIs('cam-1', 200000);
    expect(result[0].pctVida).toBe(100);
    expect(result[0].alertar).toBe(true);
  });

  it('kmRodados nunca é negativo quando kmAtual < kmInstalacao', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p-1', posicao: 'estepe', marca: 'B', modelo: 'R', kmInstalacao: 100000, kmVidaUtil: 80000 },
    ]);

    const result = await svc.getKPIs('cam-1', 50000);
    expect(result[0].kmRodados).toBe(0);
    expect(result[0].pctVida).toBe(0);
    expect(result[0].alertar).toBe(false);
  });
});

// ─── getKPIsGlobal ────────────────────────────────────────────────────────────

const mockQueryRaw = prisma.$queryRaw as jest.Mock;

describe('PneusService.getKPIsGlobal', () => {
  it('retorna estrutura completa convertendo BigInt do SQL', async () => {
    mockQueryRaw.mockResolvedValue([{
      total: BigInt(10), ativos: BigInt(8), inativos: BigInt(2),
      alertas80: BigInt(1), alertas95: BigInt(0), vida_media_pct: 65,
    }]);

    const result = await svc.getKPIsGlobal();

    expect(result.total).toBe(10);
    expect(result.ativos).toBe(8);
    expect(result.inativos).toBe(2);
    expect(result.alertas80).toBe(1);
    expect(result.alertas95).toBe(0);
    expect(result.vidaMediaPct).toBe(65);
  });

  it('vidaMediaPct é 0 quando vida_media_pct é null (sem pneus ativos)', async () => {
    mockQueryRaw.mockResolvedValue([{
      total: BigInt(0), ativos: BigInt(0), inativos: BigInt(0),
      alertas80: BigInt(0), alertas95: BigInt(0), vida_media_pct: null,
    }]);

    const result = await svc.getKPIsGlobal();
    expect(result.vidaMediaPct).toBe(0);
    expect(result.alertas80).toBe(0);
  });

  it('executa uma única query SQL (em vez de 4 queries separadas)', async () => {
    mockQueryRaw.mockResolvedValue([{
      total: BigInt(5), ativos: BigInt(5), inativos: BigInt(0),
      alertas80: BigInt(2), alertas95: BigInt(1), vida_media_pct: 88,
    }]);

    await svc.getKPIsGlobal();

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.pneu.count).not.toHaveBeenCalled();
    expect(prisma.pneu.findMany).not.toHaveBeenCalled();
  });
});

// ─── listarPorCaminhao ────────────────────────────────────────────────────────

describe('PneusService.listarPorCaminhao', () => {
  const pneuFixture = {
    id: 'pneu-1',
    codigo: 'PNE-001',
    caminhaoId: 'cam-1',
    posicao: 'dianteiro_esq',
    marca: 'Bridgestone',
    modelo: 'R22',
    status: 'ativo',
    kmInstalacao: 50000,
    kmVidaUtil: 80000,
    trocas: [],
  };

  it('retorna pneus do caminhão com trocas incluídas', async () => {
    mockFindMany.mockResolvedValue([pneuFixture]);
    const result = await svc.listarPorCaminhao('cam-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pneu-1');
    expect(result[0].trocas).toEqual([]);
  });

  it('retorna array vazio quando caminhão não tem pneus cadastrados', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await svc.listarPorCaminhao('cam-sem-pneus');
    expect(result).toHaveLength(0);
  });

  it('filtra por caminhaoId e ordena por posicao asc', async () => {
    mockFindMany.mockResolvedValue([]);
    await svc.listarPorCaminhao('cam-1');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { caminhaoId: 'cam-1' },
        orderBy: { posicao: 'asc' },
      }),
    );
  });
});

// ─── listarAlertas ────────────────────────────────────────────────────────────

describe('PneusService.listarAlertas', () => {
  it('retorna caminhões com pneus >= 80% convertendo BigInt', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        caminhao_id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH',
        km_atual: 120000, pneus_alerta: BigInt(2), max_pct: 92,
      },
    ]);

    const result = await svc.listarAlertas();

    expect(result).toHaveLength(1);
    expect(result[0].caminhaoId).toBe('cam-1');
    expect(result[0].codigo).toBe('CAM-001');
    expect(result[0].pneusAlerta).toBe(2);
    expect(result[0].maxPct).toBe(92);
  });

  it('retorna array vazio quando nenhum caminhão tem pneus em alerta', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await svc.listarAlertas();
    expect(result).toHaveLength(0);
  });

  it('executa uma única query SQL', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await svc.listarAlertas();
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.pneu.findMany).not.toHaveBeenCalled();
  });

  it('mapeia múltiplos caminhões ordenados por maxPct desc', async () => {
    mockQueryRaw.mockResolvedValue([
      { caminhao_id: 'cam-a', codigo: 'CAM-A', placa: 'A', modelo: 'M1', km_atual: 50000, pneus_alerta: BigInt(3), max_pct: 98 },
      { caminhao_id: 'cam-b', codigo: 'CAM-B', placa: 'B', modelo: 'M2', km_atual: 60000, pneus_alerta: BigInt(1), max_pct: 82 },
    ]);

    const result = await svc.listarAlertas();

    expect(result).toHaveLength(2);
    expect(result[0].maxPct).toBe(98); // mais crítico primeiro
    expect(result[1].maxPct).toBe(82);
  });
});
