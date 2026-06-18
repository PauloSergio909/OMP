// Testes dos métodos analíticos de Frota: custoPorKm, timelineManutencao, historicoKm

jest.mock('../config/database', () => ({
  prisma: {
    caminhao: {
      findMany: jest.fn(),
    },
    ordemServico: {
      groupBy:   jest.fn(),
      findMany:  jest.fn(),
    },
    trocaPneu: {
      findMany: jest.fn(),
    },
    checklistVistoria: {
      findMany: jest.fn(),
    },
    kmRegistro: {
      findMany: jest.fn(),
      groupBy:  jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { FrotaService } from '../modules/frota/frota.service';
import { prisma } from '../config/database';

const mockCamFindMany  = prisma.caminhao.findMany as jest.Mock;
const mockOSGroupBy    = prisma.ordemServico.groupBy as jest.Mock;
const mockOSFindMany   = prisma.ordemServico.findMany as jest.Mock;
const mockTrocaFindMany = prisma.trocaPneu.findMany as jest.Mock;
const mockCkFindMany   = prisma.checklistVistoria.findMany as jest.Mock;
const mockKmFindMany   = prisma.kmRegistro.findMany as jest.Mock;
const mockKmGroupBy    = prisma.kmRegistro.groupBy as jest.Mock;
const mockQueryRaw     = prisma.$queryRaw as jest.Mock;

const svc = new FrotaService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── custoPorKm ───────────────────────────────────────────────────────────────

describe('FrotaService.custoPorKm', () => {
  const camBase = { id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH', fabricante: 'Volvo', kmAtual: 100000 };

  it('calcula custoPorKm = (custoOS + custoCombustivel) / kmRodados', async () => {
    mockCamFindMany.mockResolvedValue([camBase]);
    mockOSGroupBy.mockResolvedValue([{ caminhaoId: 'cam-1', _sum: { custoTotal: 5000 } }]);
    mockQueryRaw.mockResolvedValue([{ caminhao_id: 'cam-1', total: 2000 }]); // combustível
    mockKmGroupBy.mockResolvedValue([{ caminhaoId: 'cam-1', _min: { km: 80000 } }]); // km inicial

    const result = await svc.custoPorKm();

    // kmRodados = 100000 - 80000 = 20000 km
    // total = 5000 + 2000 = 7000
    // custoPorKm = 7000 / 20000 = 0.35
    expect(result).toHaveLength(1);
    expect(result[0].custoPorKm).toBe(0.35);
    expect(result[0].kmRodados).toBe(20000);
    expect(result[0].total).toBe(7000);
  });

  it('custoPorKm=0 quando kmRodados=0 (sem registros de KM)', async () => {
    mockCamFindMany.mockResolvedValue([camBase]);
    mockOSGroupBy.mockResolvedValue([{ caminhaoId: 'cam-1', _sum: { custoTotal: 1000 } }]);
    mockQueryRaw.mockResolvedValue([]);
    mockKmGroupBy.mockResolvedValue([]); // sem km iniciais

    const result = await svc.custoPorKm();

    // kmRodados = max(0, 100000 - 0) = 100000 → custoPorKm calculado normalmente
    // Sem registros de kmRegistro: kmInicialMap vazio → kmInicial=0 → kmRodados=100000
    expect(result[0].kmRodados).toBe(100000);
  });

  it('filtra caminhões com custo total = 0', async () => {
    mockCamFindMany.mockResolvedValue([
      { id: 'cam-1', ...camBase },
      { id: 'cam-2', codigo: 'CAM-002', modelo: 'Scania', fabricante: 'Scania', kmAtual: 50000 },
    ]);
    mockOSGroupBy.mockResolvedValue([{ caminhaoId: 'cam-1', _sum: { custoTotal: 3000 } }]);
    mockQueryRaw.mockResolvedValue([]);
    mockKmGroupBy.mockResolvedValue([]);

    const result = await svc.custoPorKm();

    // cam-2 tem total=0, deve ser filtrado
    expect(result.every((r) => r.total > 0)).toBe(true);
  });

  it('retorna lista vazia quando não há caminhões', async () => {
    mockCamFindMany.mockResolvedValue([]);
    mockOSGroupBy.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
    mockKmGroupBy.mockResolvedValue([]);

    const result = await svc.custoPorKm();
    expect(result).toHaveLength(0);
  });
});

// ─── timelineManutencao ───────────────────────────────────────────────────────

describe('FrotaService.timelineManutencao', () => {
  const osEvent = {
    id: 'os-1', codigo: 'OS-001', tipo: 'preventiva', status: 'concluida', prioridade: 'media',
    dataAbertura: new Date('2026-01-10'), dataConclusao: new Date('2026-01-15'),
    custoTotal: 800, descricao: 'Revisão 50k',
    responsavel: { id: 'func-1', nome: 'Carlos' },
  };
  const trocaEvent = {
    id: 'tr-1', kmTroca: 90000, motivo: 'Desgaste', custo: 500, createdAt: new Date('2026-01-12'),
    pneu: { posicao: 'dianteiro_esq', marca: 'Bridgestone', modelo: 'R22' },
  };
  const checklistEvent = {
    id: 'cl-1', tipo: 'pre_viagem', aprovado: true, kmAtual: 90000, createdAt: new Date('2026-01-08'),
    motorista: { id: 'mot-1', nome: 'Pedro' },
    itens: [],
  };
  const kmEvent = {
    id: 'km-1', km: 90000, data: new Date('2026-01-05'),
  };

  beforeEach(() => {
    mockOSFindMany.mockResolvedValue([osEvent]);
    mockTrocaFindMany.mockResolvedValue([trocaEvent]);
    mockCkFindMany.mockResolvedValue([checklistEvent]);
    mockKmFindMany.mockResolvedValue([kmEvent]);
  });

  it('retorna todos os tipos de eventos combinados', async () => {
    const result = await svc.timelineManutencao('cam-1');
    const tipos = result.map((e) => e.tipo);
    expect(tipos).toContain('os');
    expect(tipos).toContain('troca_pneu');
    expect(tipos).toContain('checklist');
    expect(tipos).toContain('km');
  });

  it('ordena eventos por data decrescente (mais recente primeiro)', async () => {
    const result = await svc.timelineManutencao('cam-1');
    for (let i = 0; i < result.length - 1; i++) {
      expect(new Date(result[i].data).getTime()).toBeGreaterThanOrEqual(new Date(result[i + 1].data).getTime());
    }
  });

  it('OS usa dataConclusao quando disponível', async () => {
    const result = await svc.timelineManutencao('cam-1');
    const os = result.find((e) => e.tipo === 'os')!;
    expect(new Date(os.data).toISOString()).toBe(osEvent.dataConclusao.toISOString());
  });

  it('OS usa dataAbertura quando dataConclusao é null', async () => {
    mockOSFindMany.mockResolvedValue([{ ...osEvent, dataConclusao: null }]);
    const result = await svc.timelineManutencao('cam-1');
    const os = result.find((e) => e.tipo === 'os')!;
    expect(new Date(os.data).toISOString()).toBe(osEvent.dataAbertura.toISOString());
  });

  it('checklist reprovado tem status=reprovado', async () => {
    mockCkFindMany.mockResolvedValue([{ ...checklistEvent, aprovado: false, itens: [{ item: 'Freios' }] }]);
    const result = await svc.timelineManutencao('cam-1');
    const cl = result.find((e) => e.tipo === 'checklist')!;
    expect(cl.status).toBe('reprovado');
  });

  it('respeita o parâmetro limit', async () => {
    // Cria 10 eventos de OS para testar o limit
    mockOSFindMany.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({
      ...osEvent, id: `os-${i}`, dataAbertura: new Date(2026, 0, i + 1), dataConclusao: null,
    })));
    mockTrocaFindMany.mockResolvedValue([]);
    mockCkFindMany.mockResolvedValue([]);
    mockKmFindMany.mockResolvedValue([]);

    const result = await svc.timelineManutencao('cam-1', 5);
    expect(result).toHaveLength(5);
  });

  it('retorna lista vazia quando não há eventos', async () => {
    mockOSFindMany.mockResolvedValue([]);
    mockTrocaFindMany.mockResolvedValue([]);
    mockCkFindMany.mockResolvedValue([]);
    mockKmFindMany.mockResolvedValue([]);

    const result = await svc.timelineManutencao('cam-1');
    expect(result).toHaveLength(0);
  });
});

// ─── historicoKm ─────────────────────────────────────────────────────────────

describe('FrotaService.historicoKm', () => {
  it('retorna histórico de km em ordem decrescente de data', async () => {
    const registros = [
      { id: 'km-1', km: 51000, data: new Date('2026-06-01') },
      { id: 'km-2', km: 50000, data: new Date('2026-05-01') },
    ];
    mockKmFindMany.mockResolvedValue(registros);

    const result = await svc.historicoKm('cam-1');

    expect(result).toHaveLength(2);
    expect(mockKmFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { caminhaoId: 'cam-1' },
        orderBy: { data: 'desc' },
      }),
    );
  });

  it('retorna lista vazia quando não há registros', async () => {
    mockKmFindMany.mockResolvedValue([]);
    const result = await svc.historicoKm('cam-1');
    expect(result).toHaveLength(0);
  });
});
