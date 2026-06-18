jest.mock('../config/database', () => ({
  prisma: {
    caminhao: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ordemServico: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    abastecimento: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { FrotaService } from '../modules/frota/frota.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockFindFirst          = prisma.caminhao.findFirst as jest.Mock;
const mockFindMany           = prisma.caminhao.findMany as jest.Mock;
const mockFindUniqueOrThrow  = prisma.caminhao.findUniqueOrThrow as jest.Mock;
const mockCreate             = prisma.caminhao.create as jest.Mock;
const mockUpdate             = prisma.caminhao.update as jest.Mock;
const mockTransaction        = prisma.$transaction as jest.Mock;
const mockCount              = prisma.caminhao.count as jest.Mock;
const mockOSGroupBy          = prisma.ordemServico.groupBy as jest.Mock;
const mockOSAggregate        = prisma.ordemServico.aggregate as jest.Mock;
const mockAbastFindMany      = prisma.abastecimento.findMany as jest.Mock;
const mockQueryRaw           = prisma.$queryRaw as jest.Mock;

const svc = new FrotaService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── criarCaminhao — geração de código ──────────────────────────────────────

const inputCaminhao = {
  placa: 'ABC1D23', chassi: '9BW11111111111111', modelo: 'Actros',
  fabricante: 'Mercedes', anoFabricacao: 2020, kmAtual: 0,
};

describe('FrotaService.criarCaminhao — geração de código', () => {
  it('gera CAM-001 quando não há caminhões cadastrados', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'cam-1', codigo: 'CAM-001', ...inputCaminhao, motorista: null });

    await svc.criarCaminhao(inputCaminhao);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'CAM-001' }) }),
    );
  });

  it('incrementa código a partir do último (CAM-005 → CAM-006)', async () => {
    mockFindFirst.mockResolvedValue({ codigo: 'CAM-005' });
    mockCreate.mockResolvedValue({ id: 'cam-6', codigo: 'CAM-006', ...inputCaminhao, motorista: null });

    await svc.criarCaminhao(inputCaminhao);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ codigo: 'CAM-006' }) }),
    );
  });

  it('converte proximaManutencao string para Date quando fornecida', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'cam-1', codigo: 'CAM-001', ...inputCaminhao, motorista: null });

    await svc.criarCaminhao({ ...inputCaminhao, proximaManutencao: '2027-03-15' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaManutencao: expect.any(Date) }),
      }),
    );
  });

  it('define proximaManutencao=null quando não fornecida', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'cam-1', codigo: 'CAM-001', ...inputCaminhao, motorista: null });

    await svc.criarCaminhao(inputCaminhao); // sem proximaManutencao

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaManutencao: null }),
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
      .mockResolvedValueOnce({ id: 'cam-1', codigo: 'CAM-001', ...inputCaminhao, motorista: null });

    await svc.criarCaminhao(inputCaminhao);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── registrarKm ─────────────────────────────────────────────────────────────

describe('FrotaService.registrarKm — validação de KM', () => {
  it('lança AppError 422 quando km novo ≤ km atual', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cam-1', kmAtual: 50000 }),
          update: jest.fn(),
        },
        kmRegistro: { create: jest.fn() },
      };
      return fn(tx);
    });

    const err = await svc.registrarKm('cam-1', 49000).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('KM deve ser maior que o atual');
  });

  it('lança AppError 422 quando km novo = km atual (igual não é maior)', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cam-1', kmAtual: 50000 }),
          update: jest.fn(),
        },
        kmRegistro: { create: jest.fn() },
      };
      return fn(tx);
    });

    const err = await svc.registrarKm('cam-1', 50000).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('registra KM quando novo > atual', async () => {
    let txKmCreate: jest.Mock;
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cam-1', kmAtual: 50000 }),
          update: jest.fn().mockResolvedValue({}),
        },
        kmRegistro: { create: jest.fn().mockResolvedValue({ id: 'km-1', km: 51000 }) },
      };
      txKmCreate = tx.kmRegistro.create as jest.Mock;
      return fn(tx);
    });

    await svc.registrarKm('cam-1', 51000);

    expect(txKmCreate!).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ caminhaoId: 'cam-1', km: 51000 }) }),
    );
  });

  // A7 — retorna manutencaoNecessariaKm: boolean
  it('A7 — manutencaoNecessariaKm=true quando km atinge o limite configurado', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'cam-1', kmAtual: 119000, codigo: 'CAM-001',
            proximaManutencaoKm: 120000,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        kmRegistro: { create: jest.fn().mockResolvedValue({ id: 'km-1', km: 120000 }) },
      };
      return fn(tx);
    });

    const result = await svc.registrarKm('cam-1', 120000) as { manutencaoNecessariaKm: boolean; kmAtual: number };

    expect(result.manutencaoNecessariaKm).toBe(true);
    expect(result.kmAtual).toBe(120000);
  });

  it('A7 — manutencaoNecessariaKm=false quando km não atingiu o limite', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'cam-1', kmAtual: 100000, codigo: 'CAM-001',
            proximaManutencaoKm: 120000,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        kmRegistro: { create: jest.fn().mockResolvedValue({ id: 'km-1', km: 110000 }) },
      };
      return fn(tx);
    });

    const result = await svc.registrarKm('cam-1', 110000) as { manutencaoNecessariaKm: boolean };

    expect(result.manutencaoNecessariaKm).toBe(false);
  });

  it('A7 — manutencaoNecessariaKm=false quando proximaManutencaoKm não está configurado', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      const tx = {
        caminhao: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'cam-1', kmAtual: 50000, codigo: 'CAM-001',
            proximaManutencaoKm: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        kmRegistro: { create: jest.fn().mockResolvedValue({ id: 'km-1', km: 200000 }) },
      };
      return fn(tx);
    });

    const result = await svc.registrarKm('cam-1', 200000) as { manutencaoNecessariaKm: boolean };

    expect(result.manutencaoNecessariaKm).toBe(false);
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('FrotaService.getKPIs', () => {
  // 5 chamadas a count: total, operacionais, emManutencao, parados, manutencaoVencendo
  function setupCounts(total: number, operacionais: number, emManutencao: number, parados: number, manutencaoVencendo: number) {
    mockCount
      .mockResolvedValueOnce(total)
      .mockResolvedValueOnce(operacionais)
      .mockResolvedValueOnce(emManutencao)
      .mockResolvedValueOnce(parados)
      .mockResolvedValueOnce(manutencaoVencendo);
  }

  it('retorna estrutura completa com todos os campos', async () => {
    setupCounts(20, 15, 3, 2, 4);

    const result = await svc.getKPIs();

    expect(result).toEqual({
      total: 20,
      operacionais: 15,
      emManutencao: 3,
      parados: 2,
      manutencaoVencendo: 4,
      taxaDisponibilidade: 75.0,
    });
  });

  it('calcula taxaDisponibilidade como % de operacionais sobre total', async () => {
    setupCounts(10, 8, 1, 1, 0);

    const result = await svc.getKPIs();

    expect(result.taxaDisponibilidade).toBe(80.0);
  });

  it('retorna taxaDisponibilidade=0 quando frota está vazia', async () => {
    setupCounts(0, 0, 0, 0, 0);

    const result = await svc.getKPIs();

    expect(result.taxaDisponibilidade).toBe(0);
  });

  it('filtra manutencaoVencendo por status=operacional e janela de 30 dias', async () => {
    mockCount.mockResolvedValue(0);

    await svc.getKPIs();

    const chamadaManutencao = mockCount.mock.calls[4][0];
    expect(chamadaManutencao.where).toMatchObject({
      status: 'operacional',
      proximaManutencao: expect.objectContaining({
        gte: expect.any(Date),
        lte: expect.any(Date),
      }),
    });
  });
});

// ─── atualizarStatus ─────────────────────────────────────────────────────────

describe('FrotaService.atualizarStatus', () => {
  it('atualiza status do caminhão e retorna o registro', async () => {
    mockUpdate.mockResolvedValue({ id: 'cam-1', codigo: 'CAM-001', status: 'manutencao' });

    const result = await svc.atualizarStatus('cam-1', 'manutencao') as { status: string };

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cam-1' },
        data: { status: 'manutencao' },
      }),
    );
    expect(result.status).toBe('manutencao');
  });

  it('aceita todos os statuses válidos', async () => {
    for (const status of ['operacional', 'manutencao', 'parado']) {
      mockUpdate.mockResolvedValue({ id: 'cam-1', status });
      await svc.atualizarStatus('cam-1', status);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status } }),
      );
      jest.clearAllMocks();
    }
  });
});

// ─── listarCaminhoes — construção do where ────────────────────────────────────

describe('FrotaService.listarCaminhoes — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '' };
  const camRow = { id: 'cam-1', codigo: 'CAM-001', motorista: null, _count: { ordensServico: 0, abastecimentos: 0 } };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([camRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica filtro de status quando fornecido', async () => {
    await svc.listarCaminhoes({ ...paginacao, status: 'manutencao' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ status: 'manutencao' });
  });

  it('aplica proximaManutencao.lte quando manutencaoVencida=true (ignora status manual)', async () => {
    await svc.listarCaminhoes({ ...paginacao, manutencaoVencida: true, status: 'operacional' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.proximaManutencao).toEqual(
      expect.objectContaining({ lte: expect.any(Date) }),
    );
    // status explícito deve ser ignorado (sobrescrito por { not: 'parado' })
    expect(chamada.where.status).toEqual({ not: 'parado' });
  });

  it('aplica OR de busca em codigo, placa e modelo', async () => {
    await svc.listarCaminhoes({ ...paginacao, search: 'actros' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(3);
    expect(chamada.where.OR[0]).toMatchObject({ codigo: { contains: 'actros' } });
    expect(chamada.where.OR[2]).toMatchObject({ modelo: { contains: 'actros' } });
  });

  it('retorna caminhoes e total', async () => {
    const result = await svc.listarCaminhoes(paginacao);

    expect(result.caminhoes).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── atualizarCaminhao — conversão de proximaManutencao ───────────────────────

describe('FrotaService.atualizarCaminhao — proximaManutencao', () => {
  const base = { id: 'cam-1', codigo: 'CAM-001', motorista: null };

  it('converte string ISO para Date', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaManutencao: new Date('2027-01-15') });

    await svc.atualizarCaminhao('cam-1', { proximaManutencao: '2027-01-15' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaManutencao: expect.any(Date) }),
      }),
    );
  });

  it('converte null explícito para null', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaManutencao: null });

    await svc.atualizarCaminhao('cam-1', { proximaManutencao: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ proximaManutencao: null }) }),
    );
  });

  it('mantém undefined quando não fornecida (campo omitido → sem alteração no banco)', async () => {
    mockUpdate.mockResolvedValue({ ...base, proximaManutencao: new Date('2026-12-01') });

    await svc.atualizarCaminhao('cam-1', { modelo: 'Actros 2022' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proximaManutencao: undefined }),
      }),
    );
  });
});

// ─── buscarCaminhao — cálculo de custos ──────────────────────────────────────

describe('FrotaService.buscarCaminhao — agregação de custos', () => {
  const caminhaoBase = {
    id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1D23', modelo: 'Actros',
    motorista: null, ordensServico: [], abastecimentos: [], kmRegistros: [],
  };

  it('calcula custoTotalCombustivel somando litros × precoLitro de todos os abastecimentos', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(caminhaoBase);
    mockOSAggregate.mockResolvedValue({ _sum: { custoTotal: 8000 }, _count: 3 });
    // 200L × 6.00 + 150L × 6.50 = 1200 + 975 = 2175
    mockAbastFindMany.mockResolvedValue([
      { litros: 200, precoLitro: 6.0 },
      { litros: 150, precoLitro: 6.5 },
    ]);

    const result = await svc.buscarCaminhao('cam-1');

    expect(result.custos.custoTotalCombustivel).toBeCloseTo(2175, 2);
    expect(result.custos.totalAbastecimentos).toBe(2);
  });

  it('usa custoTotalOS=0 quando aggregate retorna null', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(caminhaoBase);
    mockOSAggregate.mockResolvedValue({ _sum: { custoTotal: null }, _count: 0 });
    mockAbastFindMany.mockResolvedValue([]);

    const result = await svc.buscarCaminhao('cam-1');

    expect(result.custos.custoTotalOS).toBe(0);
    expect(result.custos.totalOS).toBe(0);
  });

  it('retorna custoTotalCombustivel=0 quando não há abastecimentos', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(caminhaoBase);
    mockOSAggregate.mockResolvedValue({ _sum: { custoTotal: 5000 }, _count: 2 });
    mockAbastFindMany.mockResolvedValue([]);

    const result = await svc.buscarCaminhao('cam-1');

    expect(result.custos.custoTotalCombustivel).toBe(0);
  });
});

// ─── rankingCusto — join, filtro e ordenação ─────────────────────────────────

describe('FrotaService.rankingCusto', () => {
  const caminhoes = [
    { id: 'cam-1', codigo: 'CAM-001', modelo: 'Actros', fabricante: 'Mercedes' },
    { id: 'cam-2', codigo: 'CAM-002', modelo: 'Constellation', fabricante: 'Volkswagen' },
    { id: 'cam-3', codigo: 'CAM-003', modelo: 'TGX', fabricante: 'MAN' }, // sem custo
  ];

  beforeEach(() => {
    mockFindMany.mockResolvedValue(caminhoes);
    mockOSGroupBy.mockResolvedValue([
      { caminhaoId: 'cam-1', _sum: { custoTotal: 8000 } },
      { caminhaoId: 'cam-2', _sum: { custoTotal: 3000 } },
      // cam-3 não tem OS
    ]);
    // $queryRaw para combustível
    mockQueryRaw.mockResolvedValue([
      { caminhao_id: 'cam-1', total: '2000' },
      { caminhao_id: 'cam-2', total: '1500' },
    ]);
  });

  it('calcula custoOS, custoCombustivel e total corretamente', async () => {
    const result = await svc.rankingCusto();

    const cam1 = result.find((r) => r.caminhao === 'CAM-001')!;
    expect(cam1.custoOS).toBe(8000);
    expect(cam1.custoCombustivel).toBe(2000);
    expect(cam1.total).toBe(10000);
  });

  it('exclui caminhões com custo total = 0 (sem OS e sem abastecimento)', async () => {
    const result = await svc.rankingCusto();

    const codigos = result.map((r) => r.caminhao);
    expect(codigos).not.toContain('CAM-003');
  });

  it('ordena por total decrescente e respeita o limite top', async () => {
    // cam-1: total=10000, cam-2: total=4500 → cam-1 primeiro
    const result = await svc.rankingCusto(1); // top=1

    expect(result).toHaveLength(1);
    expect(result[0].caminhao).toBe('CAM-001');
  });
    
  it('trata totalOS null como 0 e inclui no cálculo', async () => {
    mockOSGroupBy.mockResolvedValue({ caminhoaId: 'cam-1', _sum: { custoTotal: null } });
    const result = await svc.rankingCusto();
  
  const cam1 = result.find((r) => r.caminhao === 'CAM-001')!;
    expect(cam1.custoOS).toBe(0);
    expect(cam1.custoCombustivel).toBe(2000);
    expect(cam1.total).toBe(2000);})

  });

// ─── documentosVencendo (F7) ──────────────────────────────────────────────────

describe('FrotaService.documentosVencendo', () => {
  const camDoc = {
    id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH', placa: 'ABC1234', status: 'operacional',
    vencimentoCrlv: new Date(Date.now() + 5 * 86400000), vencimentoSeguro: null, numeroSeguro: null,
  };

  it('busca caminhões com CRLV ou seguro vencendo e exclui status=parado', async () => {
    mockFindMany.mockResolvedValue([camDoc]);

    const result = await svc.documentosVencendo();

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ vencimentoCrlv: expect.objectContaining({ lte: expect.any(Date) }) }),
            expect.objectContaining({ vencimentoSeguro: expect.objectContaining({ lte: expect.any(Date) }) }),
          ]),
          status: { not: 'parado' },
        }),
      }),
    );
  });

  it('retorna lista vazia quando todos os documentos estão em dia', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await svc.documentosVencendo();
    expect(result).toHaveLength(0);
  });

  it('usa janela de dias personalizada quando informada', async () => {
    mockFindMany.mockResolvedValue([]);
    await svc.documentosVencendo(7);

    const chamada = mockFindMany.mock.calls[0][0];
    const limite: Date = chamada.where.OR[0].vencimentoCrlv.lte;
    const diferencaDias = Math.round((limite.getTime() - Date.now()) / 86400000);
    expect(diferencaDias).toBeGreaterThanOrEqual(6);
    expect(diferencaDias).toBeLessThanOrEqual(7);
  });
});

// ─── caminhoesComManutencaoVencendo ───────────────────────────────────────────

describe('FrotaService.caminhoesComManutencaoVencendo', () => {
  const camManutencao = {
    id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH', placa: 'ABC1234', status: 'operacional',
    proximaManutencao: new Date(Date.now() + 5 * 86400000),
    motorista: { id: 'mot-1', nome: 'Carlos' },
  };

  it('retorna caminhões operacionais com manutenção nos próximos 30 dias', async () => {
    mockFindMany.mockResolvedValue([camManutencao]);

    const result = await svc.caminhoesComManutencaoVencendo();

    expect(result).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          proximaManutencao: expect.objectContaining({ lte: expect.any(Date) }),
          status: 'operacional',
        }),
      }),
    );
  });

  it('exclui caminhões com status diferente de operacional', async () => {
    mockFindMany.mockResolvedValue([]);
    await svc.caminhoesComManutencaoVencendo();

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.status).toBe('operacional');
  });

  it('retorna lista vazia quando não há manutenções vencendo', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await svc.caminhoesComManutencaoVencendo();
    expect(result).toHaveLength(0);
  });

  it('inclui dados do motorista no resultado', async () => {
    mockFindMany.mockResolvedValue([camManutencao]);
    const result = await svc.caminhoesComManutencaoVencendo() as typeof result;

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          motorista: expect.objectContaining({ select: expect.objectContaining({ nome: true }) }),
        }),
      }),
    );
  });
});

// ─── caminhoesProximosManutencaoKm ────────────────────────────────────────────

const mockQueryRaw = prisma.$queryRaw as jest.Mock;

describe('FrotaService.caminhoesProximosManutencaoKm', () => {
  it('retorna caminhões dentro da margem km convertendo tipos', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH', status: 'operacional',
        km_atual: 99200, proxima_manutencao_km: 100000,
        km_restantes: 800, motorista_nome: 'João',
      },
    ]);

    const result = await svc.caminhoesProximosManutencaoKm(1000);

    expect(result).toHaveLength(1);
    expect(result[0].kmRestantes).toBe(800);
    expect(result[0].urgente).toBe(false);
    expect(result[0].motoristaNome).toBe('João');
  });

  it('marca urgente=true quando caminhão já ultrapassou o km de manutenção', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        id: 'cam-2', codigo: 'CAM-002', placa: 'DEF5678', modelo: 'Mercedes', status: 'operacional',
        km_atual: 101000, proxima_manutencao_km: 100000,
        km_restantes: -1000, motorista_nome: null,
      },
    ]);

    const result = await svc.caminhoesProximosManutencaoKm();

    expect(result[0].urgente).toBe(true);
    expect(result[0].motoristaNome).toBeNull();
  });

  it('retorna array vazio quando nenhum caminhão está dentro da margem', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await svc.caminhoesProximosManutencaoKm(500);
    expect(result).toHaveLength(0);
  });

  it('executa uma única query SQL', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await svc.caminhoesProximosManutencaoKm();
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.caminhao.findMany).not.toHaveBeenCalled();
  });
});
