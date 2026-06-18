jest.mock('../config/database', () => ({
  prisma: {
    abastecimento: { findMany: jest.fn(), count: jest.fn(), update: jest.fn(), delete: jest.fn(), groupBy: jest.fn() },
    caminhao: { findMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { AbastecimentoService } from '../modules/abastecimento/abastecimento.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';

const mockTransaction    = prisma.$transaction as jest.Mock;
const mockCount          = prisma.abastecimento.count as jest.Mock;
const mockFindMany       = prisma.abastecimento.findMany as jest.Mock;
const mockUpdate         = prisma.abastecimento.update as jest.Mock;
const mockDelete         = prisma.abastecimento.delete as jest.Mock;
const mockGroupBy        = prisma.abastecimento.groupBy as jest.Mock;
const mockCaminhaoFindMany = prisma.caminhao.findMany as jest.Mock;
const mockQueryRaw       = prisma.$queryRaw as jest.Mock;

const svc = new AbastecimentoService();

beforeEach(() => { jest.clearAllMocks(); });

const inputAbastecimento = {
  caminhaoId: 'cam-1',
  motoristaId: 'func-1',
  litros: 200,
  precoLitro: 6.5,
  kmAtual: 51000,
  combustivel: 'diesel',
  posto: 'Posto Shell',
};

function makeTx(kmAtualCaminhao: number) {
  return {
    caminhao: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ kmAtual: kmAtualCaminhao }),
      update: jest.fn(),
    },
    abastecimento: {
      create: jest.fn().mockResolvedValue({
        id: 'ab-1',
        caminhao: { codigo: 'CAM-001' },
        ...inputAbastecimento,
      }),
    },
    kmRegistro: { create: jest.fn() },
  };
}

// ─── registrar — validação de KM ─────────────────────────────────────────────

describe('AbastecimentoService.registrar — validação de KM', () => {
  it('lança AppError 422 quando kmAtual < km atual do caminhão', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx(55000)));

    const err = await svc.registrar({ ...inputAbastecimento, kmAtual: 54000 }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toContain('KM deve ser maior que o atual');
    expect(err.message).toContain('55000');
  });

  it('lança AppError 422 quando kmAtual = km atual do caminhão', async () => {
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(makeTx(51000)));

    const err = await svc.registrar({ ...inputAbastecimento, kmAtual: 51000 }).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('registra abastecimento quando kmAtual > km atual do caminhão', async () => {
    const tx = makeTx(50000);
    mockTransaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.registrar(inputAbastecimento);

    expect(tx.abastecimento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kmAtual: 51000, litros: 200 }),
      }),
    );
    expect(tx.caminhao.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { kmAtual: 51000 } }),
    );
    expect(tx.kmRegistro.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ km: 51000 }) }),
    );
  });
});

// ─── getKPIs ──────────────────────────────────────────────────────────────────

describe('AbastecimentoService.getKPIs', () => {
  it('soma litros e calcula precoMedioLitro corretamente', async () => {
    mockCount.mockResolvedValue(3);
    mockFindMany.mockResolvedValue([
      { litros: 200, precoLitro: 6.0 },
      { litros: 150, precoLitro: 6.5 },
      { litros: 100, precoLitro: 5.8 },
    ]);

    const result = await svc.getKPIs();

    expect(result.abastecimentosMes).toBe(3);
    expect(result.litrosMes).toBeCloseTo(450, 5);
    // custo = 200*6.0 + 150*6.5 + 100*5.8 = 1200 + 975 + 580 = 2755
    expect(result.custoMes).toBeCloseTo(2755, 5);
    // precoMedio = 2755 / 450 ≈ 6.122
    expect(result.precoMedioLitro).toBeCloseTo(2755 / 450, 5);
  });

  it('retorna precoMedioLitro=0 quando não há abastecimentos no mês', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const result = await svc.getKPIs();

    expect(result.abastecimentosMes).toBe(0);
    expect(result.litrosMes).toBe(0);
    expect(result.custoMes).toBe(0);
    expect(result.precoMedioLitro).toBe(0); // sem divisão por zero
  });

  it('inclui filtro por caminhaoId quando fornecido', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([{ litros: 300, precoLitro: 6.2 }]);

    await svc.getKPIs('cam-1');

    const [countCall] = mockCount.mock.calls;
    expect(countCall[0].where).toMatchObject({ caminhaoId: 'cam-1' });

    const [findManyCall] = mockFindMany.mock.calls;
    expect(findManyCall[0].where).toMatchObject({ caminhaoId: 'cam-1' });
  });

  it('não inclui caminhaoId no where quando omitido', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await svc.getKPIs(); // sem argumento

    const [countCall] = mockCount.mock.calls;
    expect(countCall[0].where).not.toHaveProperty('caminhaoId');
  });
});

// ─── listar — construção do where ─────────────────────────────────────────────

describe('AbastecimentoService.listar — construção do where', () => {
  const paginacao = { page: 1, perPage: 20, search: '' };
  const abRow = { id: 'ab-1', litros: 200, caminhao: { id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1D23', modelo: 'Actros' }, motorista: null };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([abRow]);
    mockCount.mockResolvedValue(1);
  });

  it('aplica caminhaoId quando fornecido', async () => {
    await svc.listar({ ...paginacao, caminhaoId: 'cam-1' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ caminhaoId: 'cam-1' });
  });

  it('aplica combustivel quando fornecido', async () => {
    await svc.listar({ ...paginacao, combustivel: 'diesel' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toMatchObject({ combustivel: 'diesel' });
  });

  it('aplica data.gte quando dataDe fornecido', async () => {
    await svc.listar({ ...paginacao, dataDe: '2026-01-01' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.data).toMatchObject({ gte: expect.any(Date) });
  });

  it('aplica OR de busca em posto, caminhao e motorista', async () => {
    await svc.listar({ ...paginacao, search: 'shell' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(3);
    expect(chamada.where.OR[0]).toMatchObject({ posto: { contains: 'shell' } });
    expect(chamada.where.OR[2]).toMatchObject({ motorista: { nome: { contains: 'shell' } } });
  });

  it('retorna abastecimentos e total', async () => {
    const result = await svc.listar(paginacao);

    expect(result.abastecimentos).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ─── atualizar — conversão de data ────────────────────────────────────────────

describe('AbastecimentoService.atualizar — conversão de data', () => {
  const abRetorno = {
    id: 'ab-1', litros: 200, precoLitro: 6.5, kmAtual: 51000,
    caminhao: { id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1D23', modelo: 'Actros' },
    motorista: null,
  };

  it('converte string ISO para Date quando data fornecida', async () => {
    mockUpdate.mockResolvedValue(abRetorno);

    await svc.atualizar('ab-1', { data: '2026-05-20' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ data: expect.any(Date) }),
      }),
    );
  });

  it('mantém data como undefined quando não fornecida', async () => {
    mockUpdate.mockResolvedValue(abRetorno);

    await svc.atualizar('ab-1', { litros: 250 });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ data: undefined }),
      }),
    );
  });
});

// ─── remover ─────────────────────────────────────────────────────────────────

describe('AbastecimentoService.remover', () => {
  it('chama delete com o id correto', async () => {
    mockDelete.mockResolvedValue({ id: 'ab-1' });

    await svc.remover('ab-1');

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'ab-1' } });
  });
});

// ─── consumoPorCaminhao — join via Map ────────────────────────────────────────

describe('AbastecimentoService.consumoPorCaminhao', () => {
  const groupByResult = [
    { caminhaoId: 'cam-1', _sum: { litros: 350 }, _count: 3 },
    { caminhaoId: 'cam-2', _sum: { litros: 200 }, _count: 1 },
  ];

  beforeEach(() => {
    mockGroupBy.mockResolvedValue(groupByResult);
  });

  it('junta cada item com o caminhão correspondente via Map', async () => {
    mockCaminhaoFindMany.mockResolvedValue([
      { id: 'cam-1', codigo: 'CAM-001', modelo: 'Actros' },
      { id: 'cam-2', codigo: 'CAM-002', modelo: 'Constellation' },
    ]);

    const result = await svc.consumoPorCaminhao();

    expect(result).toHaveLength(2);
    const cam1 = result.find((r: { caminhaoId: string }) => r.caminhaoId === 'cam-1')!;
    expect(cam1.caminhao).toMatchObject({ codigo: 'CAM-001', modelo: 'Actros' });
    expect(cam1._sum.litros).toBe(350);
  });

  it('caminhao=undefined quando caminhaoId não tem registro na frota', async () => {
    // caminhao.findMany retorna vazio → Map não tem cam-1 nem cam-2
    mockCaminhaoFindMany.mockResolvedValue([]);

    const result = await svc.consumoPorCaminhao();

    expect(result[0].caminhao).toBeUndefined();
  });

  it('passa os IDs corretos para caminhao.findMany via { in: [...] }', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);

    await svc.consumoPorCaminhao();

    expect(mockCaminhaoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['cam-1', 'cam-2'] } },
      }),
    );
  });
});

// ─── historicoMensal — preenchimento de meses sem dados ──────────────────────

describe('AbastecimentoService.historicoMensal', () => {
  it('retorna exatamente "meses" entradas (padrão = 6)', async () => {
    mockQueryRaw.mockResolvedValue([]); // nenhum dado no banco

    const result = await svc.historicoMensal();

    expect(result).toHaveLength(6);
  });

  it('preenche meses sem dados com litros=0, custo=0, abastecimentos=0', async () => {
    mockQueryRaw.mockResolvedValue([]); // sem dados

    const result = await svc.historicoMensal(3);

    result.forEach((item) => {
      expect(item.litros).toBe(0);
      expect(item.custo).toBe(0);
      expect(item.abastecimentos).toBe(0);
    });
  });

  it('injeta dados do banco quando o mês bate com a chave YYYY-MM', async () => {
    // Gera o primeiro dia do mês atual para garantir que a chave YYYY-MM bate
    const hoje = new Date();
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    mockQueryRaw.mockResolvedValue([
      { mes_inicio: mesAtual, litros: 450.5, custo: 2755.0, abastecimentos: 5 },
    ]);

    const result = await svc.historicoMensal(1); // apenas o mês atual

    expect(result).toHaveLength(1);
    expect(result[0].litros).toBeCloseTo(450.5, 1);
    expect(result[0].custo).toBeCloseTo(2755.0, 2);
    expect(result[0].abastecimentos).toBe(5);
  });

  it('respeita o parâmetro meses retornando N entradas', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await svc.historicoMensal(12);

    expect(result).toHaveLength(12);
  });
});

// ─── rankingEficiencia ────────────────────────────────────────────────────────

describe('AbastecimentoService.rankingEficiencia', () => {
  it('retorna ranking com média km/L convertendo tipos do SQL', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        caminhao_id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH',
        media_kml: 3.45, total_litros: 2800.5, total_abastecimentos: BigInt(12),
      },
      {
        caminhao_id: 'cam-2', codigo: 'CAM-002', placa: 'DEF5678', modelo: 'Mercedes',
        media_kml: 2.80, total_litros: 1500.0, total_abastecimentos: BigInt(6),
      },
    ]);

    const result = await svc.rankingEficiencia();

    expect(result).toHaveLength(2);
    expect(result[0].caminhaoId).toBe('cam-1');
    expect(result[0].mediaKmL).toBe(3.45);
    expect(result[0].totalLitros).toBe(2800.5);
    expect(result[0].totalAbastecimentos).toBe(12);
    expect(result[1].mediaKmL).toBe(2.80);
  });

  it('retorna array vazio quando não há dados suficientes', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await svc.rankingEficiencia();
    expect(result).toHaveLength(0);
  });

  it('executa uma única query SQL (CTE com LAG)', async () => {
    mockQueryRaw.mockResolvedValue([]);
    await svc.rankingEficiencia();
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.abastecimento.findMany).not.toHaveBeenCalled();
  });

  it('media_kml null mapeia para null (menos de 2 abastecimentos no DB)', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        caminhao_id: 'cam-3', codigo: 'CAM-003', placa: 'GHI9012', modelo: 'Scania',
        media_kml: null, total_litros: 500.0, total_abastecimentos: BigInt(1),
      },
    ]);

    const result = await svc.rankingEficiencia();
    // Query exclui esses via HAVING, mas se retornar, o map deve manter null
    expect(result[0].mediaKmL).toBeNull();
  });
});

// ─── getEficienciaCaminhao ────────────────────────────────────────────────────

describe('AbastecimentoService.getEficienciaCaminhao', () => {
  it('retorna média km/L e total de abastecimentos', async () => {
    mockQueryRaw.mockResolvedValue([{ media_kml: 3.12, total_abastecimentos: BigInt(8) }]);

    const result = await svc.getEficienciaCaminhao('cam-1');

    expect(result.mediaKmL).toBe(3.12);
    expect(result.totalAbastecimentos).toBe(8);
  });

  it('retorna mediaKmL=null quando não há pares de abastecimento', async () => {
    mockQueryRaw.mockResolvedValue([{ media_kml: null, total_abastecimentos: BigInt(1) }]);

    const result = await svc.getEficienciaCaminhao('cam-1');

    expect(result.mediaKmL).toBeNull();
    expect(result.totalAbastecimentos).toBe(1);
  });

  it('executa uma única query SQL (CTE por caminhão)', async () => {
    mockQueryRaw.mockResolvedValue([{ media_kml: 2.9, total_abastecimentos: BigInt(5) }]);

    await svc.getEficienciaCaminhao('cam-abc');

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.abastecimento.findMany).not.toHaveBeenCalled();
  });
});
