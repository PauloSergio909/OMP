// Testes dos métodos analíticos de OS: osPorMecanico e custoPorCaminhao

jest.mock('../config/database', () => ({
  prisma: {
    ordemServico: {
      groupBy:   jest.fn(),
      aggregate: jest.fn(),
    },
    funcionario: {
      findMany: jest.fn(),
    },
    caminhao: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { OrdemServicoService } from '../modules/ordem-servico/os.service';
import { prisma } from '../config/database';

const mockOSGroupBy    = prisma.ordemServico.groupBy as jest.Mock;
const mockOSAggregate  = prisma.ordemServico.aggregate as jest.Mock;
const mockFuncFindMany = prisma.funcionario.findMany as jest.Mock;
const mockCamFindMany  = prisma.caminhao.findMany as jest.Mock;

const svc = new OrdemServicoService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── osPorMecanico ────────────────────────────────────────────────────────────

describe('OrdemServicoService.osPorMecanico', () => {
  it('retorna lista vazia quando não há OS com responsável', async () => {
    mockOSGroupBy.mockResolvedValue([]);

    const result = await svc.osPorMecanico();

    expect(result).toEqual([]);
    expect(mockFuncFindMany).not.toHaveBeenCalled();
  });

  it('agrega abertas, concluidas e total por responsável', async () => {
    mockOSGroupBy.mockResolvedValue([
      { responsavelId: 'func-1', status: 'agendada',     _count: { _all: 3 } },
      { responsavelId: 'func-1', status: 'em_andamento', _count: { _all: 2 } },
      { responsavelId: 'func-1', status: 'concluida',    _count: { _all: 8 } },
      { responsavelId: 'func-2', status: 'agendada',     _count: { _all: 1 } },
      { responsavelId: 'func-2', status: 'concluida',    _count: { _all: 4 } },
    ]);
    mockFuncFindMany.mockResolvedValue([
      { id: 'func-1', nome: 'Carlos Silva', cargo: 'mecanico' },
      { id: 'func-2', nome: 'Ana Costa',   cargo: 'mecanico' },
    ]);

    const result = await svc.osPorMecanico();

    const carlos = result.find((r) => r.id === 'func-1')!;
    expect(carlos.nome).toBe('Carlos Silva');
    expect(carlos.abertas).toBe(5);    // 3 agendada + 2 em_andamento
    expect(carlos.concluidas).toBe(8);
    expect(carlos.total).toBe(13);

    const ana = result.find((r) => r.id === 'func-2')!;
    expect(ana.abertas).toBe(1);
    expect(ana.concluidas).toBe(4);
    expect(ana.total).toBe(5);
  });

  it('ordena por total decrescente', async () => {
    mockOSGroupBy.mockResolvedValue([
      { responsavelId: 'func-a', status: 'concluida', _count: { _all: 2 } },
      { responsavelId: 'func-b', status: 'concluida', _count: { _all: 10 } },
    ]);
    mockFuncFindMany.mockResolvedValue([
      { id: 'func-a', nome: 'A', cargo: 'mecanico' },
      { id: 'func-b', nome: 'B', cargo: 'mecanico' },
    ]);

    const result = await svc.osPorMecanico();

    expect(result[0].id).toBe('func-b'); // maior total primeiro
    expect(result[1].id).toBe('func-a');
  });

  it('conta orcamento como status aberto', async () => {
    mockOSGroupBy.mockResolvedValue([
      { responsavelId: 'func-1', status: 'orcamento', _count: { _all: 2 } },
    ]);
    mockFuncFindMany.mockResolvedValue([
      { id: 'func-1', nome: 'Pedro', cargo: 'mecanico' },
    ]);

    const result = await svc.osPorMecanico();

    expect(result[0].abertas).toBe(2); // orcamento é status aberto
  });

  it('usa responsavelId como nome fallback quando funcionário não encontrado', async () => {
    mockOSGroupBy.mockResolvedValue([
      { responsavelId: 'func-inexistente', status: 'agendada', _count: { _all: 1 } },
    ]);
    mockFuncFindMany.mockResolvedValue([]); // não encontrou funcionário

    const result = await svc.osPorMecanico();

    expect(result[0].nome).toBe('func-inexistente'); // fallback para o ID
  });

  it('ignora entradas com responsavelId null', async () => {
    mockOSGroupBy.mockResolvedValue([
      { responsavelId: null, status: 'agendada', _count: { _all: 5 } },
      { responsavelId: 'func-1', status: 'concluida', _count: { _all: 3 } },
    ]);
    mockFuncFindMany.mockResolvedValue([
      { id: 'func-1', nome: 'Carlos', cargo: 'mecanico' },
    ]);

    const result = await svc.osPorMecanico();

    // Apenas func-1; OS com responsavelId=null são ignoradas
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('func-1');
  });
});

// ─── custoPorCaminhao ─────────────────────────────────────────────────────────

describe('OrdemServicoService.custoPorCaminhao', () => {
  it('retorna lista vazia quando não há OS concluídas no mês', async () => {
    mockOSGroupBy.mockResolvedValue([]);

    const result = await svc.custoPorCaminhao();

    expect(result).toEqual([]);
    expect(mockCamFindMany).not.toHaveBeenCalled();
  });

  it('agrega custo preventivo e corretivo por caminhão', async () => {
    mockOSGroupBy.mockResolvedValue([
      { caminhaoId: 'cam-1', tipo: 'preventiva', _sum: { custoTotal: 1500 } },
      { caminhaoId: 'cam-1', tipo: 'corretiva',  _sum: { custoTotal: 3000 } },
      { caminhaoId: 'cam-2', tipo: 'preventiva', _sum: { custoTotal: 800 } },
    ]);
    mockCamFindMany.mockResolvedValue([
      { id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH' },
      { id: 'cam-2', codigo: 'CAM-002', modelo: 'Scania R' },
    ]);

    const result = await svc.custoPorCaminhao();

    const cam1 = result.find((r) => r.caminhao === 'CAM-001')!;
    expect(cam1.preventiva).toBe(1500);
    expect(cam1.corretiva).toBe(3000);

    const cam2 = result.find((r) => r.caminhao === 'CAM-002')!;
    expect(cam2.preventiva).toBe(800);
    expect(cam2.corretiva).toBe(0); // nenhuma corretiva no mês
  });

  it('ordena por custo total decrescente (preventiva + corretiva)', async () => {
    mockOSGroupBy.mockResolvedValue([
      { caminhaoId: 'cam-a', tipo: 'preventiva', _sum: { custoTotal: 500 } },
      { caminhaoId: 'cam-b', tipo: 'corretiva',  _sum: { custoTotal: 2000 } },
    ]);
    mockCamFindMany.mockResolvedValue([
      { id: 'cam-a', codigo: 'CAM-A', modelo: 'A' },
      { id: 'cam-b', codigo: 'CAM-B', modelo: 'B' },
    ]);

    const result = await svc.custoPorCaminhao();

    expect(result[0].caminhao).toBe('CAM-B'); // maior total primeiro
    expect(result[1].caminhao).toBe('CAM-A');
  });

  it('trata custoTotal null como 0 (OS sem itens)', async () => {
    mockOSGroupBy.mockResolvedValue([
      { caminhaoId: 'cam-1', tipo: 'preventiva', _sum: { custoTotal: null } },
    ]);
    mockCamFindMany.mockResolvedValue([
      { id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo' },
    ]);

    const result = await svc.custoPorCaminhao();

    expect(result[0].preventiva).toBe(0);
    expect(result[0].corretiva).toBe(0);
  });

  it('usa caminhaoId como fallback de código quando caminhão não encontrado', async () => {
    mockOSGroupBy.mockResolvedValue([
      { caminhaoId: 'cam-orphan', tipo: 'corretiva', _sum: { custoTotal: 500 } },
    ]);
    mockCamFindMany.mockResolvedValue([]); // caminhão deletado

    const result = await svc.custoPorCaminhao();

    expect(result[0].caminhao).toBe('cam-orphan'); // fallback para ID
  });
});
