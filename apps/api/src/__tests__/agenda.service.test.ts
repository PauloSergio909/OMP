jest.mock('../config/database', () => ({
  prisma: {
    caminhao: {
      findMany: jest.fn(),
    },
    ordemServico: {
      findMany: jest.fn(),
    },
    agendaEvento: {
      findMany:          jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create:            jest.fn(),
      update:            jest.fn(),
      delete:            jest.fn(),
    },
  },
}));

import { AgendaService } from '../modules/agenda/agenda.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';

const mockCaminhaoFindMany   = prisma.caminhao.findMany as jest.Mock;
const mockOSFindMany         = prisma.ordemServico.findMany as jest.Mock;
const mockEventoFindMany     = prisma.agendaEvento.findMany as jest.Mock;
const mockEventoFindUnique   = prisma.agendaEvento.findUniqueOrThrow as jest.Mock;
const mockEventoCreate       = prisma.agendaEvento.create as jest.Mock;
const mockEventoUpdate       = prisma.agendaEvento.update as jest.Mock;
const mockEventoDelete       = prisma.agendaEvento.delete as jest.Mock;

const svc = new AgendaService();

beforeEach(() => { jest.clearAllMocks(); });

// helpers
function makeCaminhao(overrides = {}) {
  return {
    id: 'cam-1', codigo: 'CAM-001', modelo: 'Volvo FH', placa: 'ABC1234',
    proximaManutencao: new Date('2026-06-15T00:00:00Z'),
    status: 'operacional', motorista: null,
    ...overrides,
  };
}

function makeOS(overrides = {}) {
  return {
    id: 'os-1', codigo: 'OS-2026-001', tipo: 'preventiva', status: 'agendada',
    prioridade: 'media', dataPrevisao: new Date('2026-06-20T00:00:00Z'),
    caminhao: { id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1234' },
    responsavel: { id: 'fun-1', nome: 'Carlos' },
    ...overrides,
  };
}

function makeEvento(overrides = {}) {
  return {
    id: 'ev-1', titulo: 'Reunião de frota', descricao: 'Discussão semanal',
    data: new Date('2026-06-10T00:00:00Z'), tipo: 'reuniao', cor: 'blue',
    link: null, usuarioId: 'user-1',
    ...overrides,
  };
}

// ─── listarEventos — estrutura ────────────────────────────────────────────────

describe('AgendaService.listarEventos — mapeamento de eventos', () => {
  it('retorna mes correto no formato YYYY-MM', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');

    expect(result.mes).toBe('2026-06');
  });

  it('mapeia caminhão como evento tipo=manutencao com cor=orange e editavel=false', async () => {
    mockCaminhaoFindMany.mockResolvedValue([makeCaminhao()]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');
    const ev = result.eventos[0];

    expect(ev.tipo).toBe('manutencao');
    expect(ev.cor).toBe('orange');
    expect(ev.editavel).toBe(false);
    expect(ev.data).toBe('2026-06-15');
    expect(ev.link).toBe('/frota/cam-1');
  });

  it('inclui motoristaNome no ref do caminhão quando motorista está atribuído', async () => {
    mockCaminhaoFindMany.mockResolvedValue([
      makeCaminhao({ motorista: { id: 'mot-1', nome: 'Pedro' } }),
    ]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');
    expect((result.eventos[0].ref as { motoristaNome: string | null }).motoristaNome).toBe('Pedro');
  });

  it('mapeia OS como evento tipo=os com link correto e editavel=false', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([makeOS()]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');
    const ev = result.eventos[0];

    expect(ev.tipo).toBe('os');
    expect(ev.editavel).toBe(false);
    expect(ev.link).toBe('/ordens-servico/os-1');
    expect(ev.data).toBe('2026-06-20');
  });

  it('mapeia cor da OS: critica→red, alta→orange, media→blue', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([
      makeOS({ id: 'os-c', prioridade: 'critica' }),
      makeOS({ id: 'os-a', prioridade: 'alta' }),
      makeOS({ id: 'os-m', prioridade: 'media' }),
    ]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');
    const [critica, alta, media] = result.eventos;

    expect(critica.cor).toBe('red');
    expect(alta.cor).toBe('orange');
    expect(media.cor).toBe('blue');
  });

  it('mapeia evento manual como tipo=manual com editavel=true', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([makeEvento()]);

    const result = await svc.listarEventos('2026-06');
    const ev = result.eventos[0];

    expect(ev.tipo).toBe('manual');
    expect(ev.editavel).toBe(true);
    expect(ev.titulo).toBe('Reunião de frota');
    expect(ev.data).toBe('2026-06-10');
  });

  it('retorna lista vazia quando não há eventos no mês', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos('2026-06');

    expect(result.eventos).toHaveLength(0);
  });

  it('usa mês atual quando mes não é informado', async () => {
    mockCaminhaoFindMany.mockResolvedValue([]);
    mockOSFindMany.mockResolvedValue([]);
    mockEventoFindMany.mockResolvedValue([]);

    const result = await svc.listarEventos();
    const esperado = new Date().toISOString().substring(0, 7);

    expect(result.mes).toBe(esperado);
  });

  it('consolida todos os tipos em um único array de eventos', async () => {
    mockCaminhaoFindMany.mockResolvedValue([makeCaminhao()]);
    mockOSFindMany.mockResolvedValue([makeOS()]);
    mockEventoFindMany.mockResolvedValue([makeEvento()]);

    const result = await svc.listarEventos('2026-06');

    expect(result.eventos).toHaveLength(3);
    const tipos = result.eventos.map((e) => e.tipo);
    expect(tipos).toContain('manutencao');
    expect(tipos).toContain('os');
    expect(tipos).toContain('manual');
  });
});

// ─── criarEvento ──────────────────────────────────────────────────────────────

describe('AgendaService.criarEvento', () => {
  it('cria evento com tipo=lembrete e cor=blue por padrão', async () => {
    mockEventoCreate.mockResolvedValue({ id: 'ev-novo' });

    await svc.criarEvento({ titulo: 'Teste', data: '2026-06-25' }, 'user-1');

    expect(mockEventoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'lembrete', cor: 'blue', link: null }),
      }),
    );
  });

  it('persiste tipo e cor quando informados', async () => {
    mockEventoCreate.mockResolvedValue({ id: 'ev-novo' });

    await svc.criarEvento({ titulo: 'Reunião', data: '2026-06-25', tipo: 'reuniao', cor: 'red' }, 'user-1');

    expect(mockEventoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'reuniao', cor: 'red' }),
      }),
    );
  });

  it('converte data string para objeto Date', async () => {
    mockEventoCreate.mockResolvedValue({ id: 'ev-novo' });

    await svc.criarEvento({ titulo: 'Evento', data: '2026-07-04' }, 'user-1');

    expect(mockEventoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ data: new Date('2026-07-04') }),
      }),
    );
  });
});

// ─── atualizarEvento ─────────────────────────────────────────────────────────

describe('AgendaService.atualizarEvento', () => {
  it('atualiza evento quando usuário é o dono', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-1' });
    mockEventoUpdate.mockResolvedValue({ id: 'ev-1', titulo: 'Novo título' });

    await svc.atualizarEvento('ev-1', { titulo: 'Novo título' }, 'user-1');

    expect(mockEventoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ev-1' } }),
    );
  });

  it('lança AppError 403 quando usuário não é o dono', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-outro' });

    await expect(svc.atualizarEvento('ev-1', { titulo: 'X' }, 'user-1'))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(mockEventoUpdate).not.toHaveBeenCalled();
  });

  it('omite campos não fornecidos (atualização parcial)', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-1' });
    mockEventoUpdate.mockResolvedValue({ id: 'ev-1' });

    await svc.atualizarEvento('ev-1', { cor: 'green' }, 'user-1');

    const chamada = mockEventoUpdate.mock.calls[0][0];
    expect(chamada.data).toEqual({ cor: 'green' });
    expect(chamada.data.titulo).toBeUndefined();
  });

  it('aceita descricao=null para limpar o campo', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-1' });
    mockEventoUpdate.mockResolvedValue({ id: 'ev-1' });

    await svc.atualizarEvento('ev-1', { descricao: null }, 'user-1');

    expect(mockEventoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ descricao: null }) }),
    );
  });

  it('converte data string para objeto Date', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-1' });
    mockEventoUpdate.mockResolvedValue({ id: 'ev-1' });

    await svc.atualizarEvento('ev-1', { data: '2026-09-01' }, 'user-1');

    expect(mockEventoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ data: new Date('2026-09-01') }) }),
    );
  });
});

// ─── removerEvento ────────────────────────────────────────────────────────────

describe('AgendaService.removerEvento', () => {
  it('remove evento quando usuário é o dono', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-1' });
    mockEventoDelete.mockResolvedValue({ id: 'ev-1' });

    await svc.removerEvento('ev-1', 'user-1');

    expect(mockEventoDelete).toHaveBeenCalledWith({ where: { id: 'ev-1' } });
  });

  it('lança AppError 403 quando usuário não é o dono', async () => {
    mockEventoFindUnique.mockResolvedValue({ usuarioId: 'user-outro' });

    await expect(svc.removerEvento('ev-1', 'user-1'))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(mockEventoDelete).not.toHaveBeenCalled();
  });
});
