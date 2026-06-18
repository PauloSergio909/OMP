// OrdemServicoService.criar é chamado internamente pelo ChecklistsService (A5).
// Mockamos o módulo inteiro para interceptar a chamada automática de OS.
jest.mock('../modules/ordem-servico/os.service', () => ({
  OrdemServicoService: jest.fn().mockImplementation(() => ({
    criar: jest.fn().mockResolvedValue({ id: 'os-auto', codigo: 'OS-2026-001' }),
  })),
}));

jest.mock('../config/database', () => ({
  prisma: {
    checklistVistoria: {
      findMany:          jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create:            jest.fn(),
      count:             jest.fn(),
    },
    ordemServico: {
      count: jest.fn(), // A5 — verifica duplicata antes de criar OS corretiva
    },
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ChecklistsService } from '../modules/checklists/checklists.service';
import { OrdemServicoService } from '../modules/ordem-servico/os.service';
import { prisma } from '../config/database';

const mockCreate            = prisma.checklistVistoria.create as jest.Mock;
const mockFindMany          = prisma.checklistVistoria.findMany as jest.Mock;
const mockFindUniqueOrThrow = prisma.checklistVistoria.findUniqueOrThrow as jest.Mock;
const mockOSCount           = prisma.ordemServico.count as jest.Mock;

const svc = new ChecklistsService();

// Acesso ao mock de criar OS gerado pelo OrdemServicoService mockado
const mockOsCriar = (new (OrdemServicoService as jest.MockedClass<typeof OrdemServicoService>)()).criar as jest.Mock;

beforeEach(() => { jest.clearAllMocks(); });

// ─── criar — aprovação ────────────────────────────────────────────────────────

describe('ChecklistsService.criar — aprovação', () => {
  const baseInput = {
    caminhaoId: 'cam-1',
    motoristaId: 'mot-1',
    kmAtual: 50000,
    tipo: 'pre_viagem',
    itens: [
      { item: 'Nível de óleo', ok: true },
      { item: 'Pneus (calibragem e desgaste)', ok: true },
    ],
  };

  it('aprovado=true quando todos os itens ok', async () => {
    mockCreate.mockResolvedValue({ id: 'cl-1', aprovado: true, itens: baseInput.itens, motorista: { id: 'mot-1', nome: 'João' } });

    await svc.criar(baseInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ aprovado: true }) }),
    );
  });

  it('aprovado=false quando algum item não ok', async () => {
    const itensComReprovado = [
      { item: 'Nível de óleo', ok: false },
      { item: 'Pneus (calibragem e desgaste)', ok: true },
    ];
    mockCreate.mockResolvedValue({ id: 'cl-2', aprovado: false, itens: itensComReprovado, motorista: { id: 'mot-1', nome: 'João' } });

    await svc.criar({ ...baseInput, itens: itensComReprovado });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ aprovado: false }) }),
    );
  });

  it('usa os 10 itens padrão quando itens está vazio', async () => {
    mockCreate.mockResolvedValue({ id: 'cl-3', aprovado: true, itens: [], motorista: { id: 'mot-1', nome: 'João' } });

    await svc.criar({ ...baseInput, itens: [] });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itens: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ item: 'Freios' }),
              expect.objectContaining({ item: 'Buzina' }),
            ]),
          }),
        }),
      }),
    );
  });
});

// ─── criar — A5: OS automática por item crítico ───────────────────────────────

describe('ChecklistsService.criar — A5 (OS automática)', () => {
  const checklistId = 'cl-critico';
  const caminhaoId = 'cam-1';
  const motoristaId = 'mot-1';

  beforeEach(() => {
    mockCreate.mockResolvedValue({ id: checklistId, aprovado: false, itens: [], motorista: { id: motoristaId, nome: 'João' } });
    mockOSCount.mockResolvedValue(0); // default: sem OS corretiva aberta — permite criar
  });

  it('cria OS corretiva automática quando item crítico (Freios) é reprovado', async () => {
    await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Freios', ok: false, observacoes: 'Freio traseiro com folga' }],
    });

    expect(mockOsCriar).toHaveBeenCalledWith(
      expect.objectContaining({
        caminhaoId,
        tipo: 'corretiva',
        prioridade: 'alta',
        responsavelId: motoristaId,
      }),
    );
  });

  it('cria OS automática quando item crítico é Extintores', async () => {
    await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Extintores', ok: false }],
    });

    expect(mockOsCriar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'corretiva', prioridade: 'alta' }),
    );
  });

  it('NÃO cria OS quando item reprovado não é crítico', async () => {
    await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Nível de óleo', ok: false }],
    });

    expect(mockOsCriar).not.toHaveBeenCalled();
  });

  it('NÃO cria OS quando checklist é aprovado mesmo com itens críticos presentes (todos ok)', async () => {
    mockCreate.mockResolvedValue({ id: 'cl-ok', aprovado: true, itens: [], motorista: { id: motoristaId, nome: 'João' } });

    await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Freios', ok: true }, { item: 'Extintores', ok: true }],
    });

    expect(mockOsCriar).not.toHaveBeenCalled();
  });

  it('não propaga erro se criação de OS falhar (continua e retorna checklist)', async () => {
    mockOsCriar.mockRejectedValueOnce(new Error('DB error'));

    const result = await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Luzes dianteiras', ok: false }],
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(checklistId);
  });

  it('NÃO cria OS quando já existe OS corretiva aberta de checklist para o mesmo caminhão (A5 anti-duplicata)', async () => {
    mockOSCount.mockResolvedValue(1); // já existe OS aberta

    await svc.criar({
      caminhaoId, motoristaId, kmAtual: 50000, tipo: 'pre_viagem',
      itens: [{ item: 'Freios', ok: false, observacoes: 'Freio com problema' }],
    });

    expect(mockOsCriar).not.toHaveBeenCalled();
  });
});

// ─── listarPorCaminhao ────────────────────────────────────────────────────────

// ─── buscar ──────────────────────────────────────────────────────────────────

describe('ChecklistsService.buscar', () => {
  it('retorna checklist com caminhão, motorista e itens', async () => {
    const checklist = {
      id: 'cl-1', caminhaoId: 'cam-1', motoristaId: 'mot-1', kmAtual: 50000,
      tipo: 'pre_viagem', aprovado: true, observacoes: null,
      caminhao: { id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH', placa: 'ABC1234' },
      motorista: { id: 'mot-1', nome: 'João', cargo: 'motorista' },
      itens: [
        { id: 'it-1', item: 'Freios', ok: true, observacoes: null },
        { id: 'it-2', item: 'Extintores', ok: true, observacoes: null },
      ],
    };
    mockFindUniqueOrThrow.mockResolvedValue(checklist);

    const result = await svc.buscar('cl-1');

    expect(result).toEqual(checklist);
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cl-1' } }),
    );
  });

  it('propaga erro quando checklist não existe', async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error('Not Found'));
    await expect(svc.buscar('cl-nao-existe')).rejects.toThrow();
  });
});

describe('ChecklistsService.listarPorCaminhao', () => {
  it('retorna checklists em ordem decrescente', async () => {
    const checklists = [{ id: 'cl-2', createdAt: new Date() }, { id: 'cl-1', createdAt: new Date() }];
    mockFindMany.mockResolvedValue(checklists);

    const result = await svc.listarPorCaminhao('cam-1');

    expect(result).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { caminhaoId: 'cam-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    );
  });
});

// ─── itensPadrao ─────────────────────────────────────────────────────────────

describe('ChecklistsService.itensPadrao', () => {
  it('retorna array com 10 itens padrão', () => {
    const itens = svc.itensPadrao();
    expect(itens).toHaveLength(10);
    expect(itens).toContain('Freios');
    expect(itens).toContain('Extintores');
    expect(itens).toContain('Luzes dianteiras');
    expect(itens).toContain('Luzes traseiras/freio');
  });
});
