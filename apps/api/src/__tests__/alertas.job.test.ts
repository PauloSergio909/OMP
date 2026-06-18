jest.mock('../config/database', () => ({
  prisma: {
    funcionario:  { findMany: jest.fn() },
    caminhao:     { findMany: jest.fn() },
    material:     { findMany: jest.fn() },
    pneu:         { findMany: jest.fn() },  // A8
    ordemCompra:  { findMany: jest.fn() },  // A9
    $queryRaw:    jest.fn(),                // A10 — caminhões próximos do km de manutenção
  },
}));

jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../config/database';
import { sendEmail } from '../services/email.service';

const mockFuncionario  = prisma.funcionario.findMany as jest.Mock;
const mockCaminhao     = prisma.caminhao.findMany as jest.Mock;
const mockMaterial     = prisma.material.findMany as jest.Mock;
const mockPneu         = prisma.pneu.findMany as jest.Mock;
const mockOrdemCompra  = prisma.ordemCompra.findMany as jest.Mock;
const mockQueryRaw     = prisma.$queryRaw as jest.Mock;
const mockSendEmail    = sendEmail as jest.Mock;

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 0));

function mockEnvAndImportJob(emailDest: string) {
  jest.resetModules();
  jest.mock('../config/env', () => ({
    env: { ALERTAS_EMAIL_DEST: emailDest, ALERTAS_INTERVALO_HORAS: 24 },
  }));
  return require('../jobs/alertas.job') as typeof import('../jobs/alertas.job');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFuncionario.mockResolvedValue([]);
  mockCaminhao.mockResolvedValue([]);
  mockMaterial.mockResolvedValue([]);
  mockPneu.mockResolvedValue([]);
  mockOrdemCompra.mockResolvedValue([]);
  mockQueryRaw.mockResolvedValue([]);  // A10 — sem caminhões próximos do km de manutenção por padrão
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── sem destino ──────────────────────────────────────────────────────────────

describe('startAlertasJob — sem destino configurado', () => {
  it('não agenda nenhum timer quando ALERTAS_EMAIL_DEST está vazio', () => {
    const { startAlertasJob } = mockEnvAndImportJob('');
    startAlertasJob();
    expect(jest.getTimerCount()).toBe(0);
  });
});

// ─── com destino ──────────────────────────────────────────────────────────────

describe('startAlertasJob — com destino configurado', () => {
  it('agenda setInterval e executa imediatamente', async () => {
    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    expect(jest.getTimerCount()).toBe(1);
  });

  it('não envia e-mail quando não há alertas', async () => {
    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('envia e-mail quando há CNH vencendo', async () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFuncionario.mockResolvedValue([
      { nome: 'João Silva', cnhCategoria: 'B', cnhValidade: amanha, telefone: '11999999999' },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const call = mockSendEmail.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(call.to).toBe('alerta@empresa.com');
    expect(call.html).toContain('João Silva');
    expect(call.html).toContain('CNH');
  });

  it('envia e-mail quando há estoque abaixo do mínimo', async () => {
    mockMaterial.mockResolvedValue([
      {
        nome: 'Óleo Motor', codigo: 'MAT-001', unidadeMedida: 'L',
        estoqueMinimo: 10, ativo: true,
        estoques: [{ quantidade: 3 }],
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const call = mockSendEmail.mock.calls[0][0] as { html: string };
    expect(call.html).toContain('Óleo Motor');
    expect(call.html).toContain('MAT-001');
  });

  it('captura erros sem propagar exceção', async () => {
    mockFuncionario.mockRejectedValue(new Error('DB offline'));

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// ─── A3 — escalada: subject urgente quando há alertas vencidos ────────────────

describe('startAlertasJob — A3 escalada de alertas críticos', () => {
  it('subject normal quando alertas estão vencendo (mas não vencidos)', async () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mockFuncionario.mockResolvedValue([
      { nome: 'Pedro', cnhCategoria: 'C', cnhValidade: amanha, telefone: '11988887777' },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).not.toContain('URGENTE');
    expect(subject).toContain('FleetMaster');
  });

  it('subject urgente quando há CNH vencida (data no passado)', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockFuncionario.mockResolvedValue([
      { nome: 'Maria', cnhCategoria: 'D', cnhValidade: ontem, telefone: '11977776666' },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).toContain('URGENTE');
    expect(subject).toContain('1 alerta(s) crítico(s)');
  });

  it('subject urgente quando há manutenção vencida', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Caminhão com manutenção vencida — mockCaminhao retorna para AMBAS as chamadas findMany
    mockCaminhao
      .mockResolvedValueOnce([
        { codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo', proximaManutencao: ontem },
      ])
      .mockResolvedValueOnce([]); // documentos vencendo

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).toContain('URGENTE');
  });

  it('contagem total de críticos no subject quando múltiplos tipos', async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockFuncionario.mockResolvedValue([
      { nome: 'Ana', cnhCategoria: 'B', cnhValidade: ontem, telefone: '11966665555' },
    ]);
    // Pneu com >= 95% de vida (urgente)
    mockPneu.mockResolvedValue([
      { id: 'p-1', posicao: 'dianteiro_esq', marca: 'B', modelo: 'R', kmInstalacao: 0, kmVidaUtil: 80000,
        caminhao: { codigo: 'CAM-001', placa: 'ABC1234', kmAtual: 76000 } }, // 95%
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    // 1 CNH vencida + 1 pneu >= 95% = 2 críticos
    expect(subject).toContain('2 alerta(s) crítico(s)');
  });
});

// ─── A8 — pneus com vida útil avançada ────────────────────────────────────────

describe('startAlertasJob — A8 pneus com vida útil avançada', () => {
  it('inclui seção de pneus no e-mail quando há pneu com >= 80% de vida', async () => {
    mockPneu.mockResolvedValue([
      {
        id: 'p-1', posicao: 'dianteiro_esq', marca: 'Bridgestone', modelo: 'R22',
        kmInstalacao: 0, kmVidaUtil: 80000,
        caminhao: { codigo: 'CAM-001', placa: 'ABC1234', kmAtual: 64000 }, // 80%
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Pneus com Vida Útil Avançada');
    expect(html).toContain('CAM-001');
    expect(html).toContain('dianteiro_esq');
    expect(html).toContain('80%');
  });

  it('NÃO inclui pneu com menos de 80% de vida útil no e-mail', async () => {
    // pneu com 60% (48k de 80k)
    mockPneu.mockResolvedValue([
      {
        id: 'p-2', posicao: 'estepe', marca: 'Michelin', modelo: 'X',
        kmInstalacao: 0, kmVidaUtil: 80000,
        caminhao: { codigo: 'CAM-002', placa: 'DEF5678', kmAtual: 48000 }, // 60%
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    // Nenhum alerta → não envia e-mail
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('pneu >= 95% aparece em vermelho no HTML', async () => {
    mockPneu.mockResolvedValue([
      {
        id: 'p-3', posicao: 'traseiro_esq_ext', marca: 'Goodyear', modelo: 'G',
        kmInstalacao: 0, kmVidaUtil: 80000,
        caminhao: { codigo: 'CAM-003', placa: 'GHI9012', kmAtual: 76000 }, // 95%
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('#dc2626'); // vermelho para >= 95%
    expect(html).toContain('95%');
  });

  // F7 — documentos vencendo no e-mail
  it('inclui seção de documentos no e-mail quando há CRLV ou seguro vencendo', async () => {
    const em10Dias = new Date(Date.now() + 10 * 86400000);
    mockCaminhao
      .mockResolvedValueOnce([]) // manutenção vencendo
      .mockResolvedValueOnce([
        { codigo: 'CAM-004', placa: 'JKL3456', modelo: 'Scania R', vencimentoCrlv: em10Dias, vencimentoSeguro: null },
      ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Documentos Vencendo');
    expect(html).toContain('CAM-004');
    expect(html).toContain('JKL3456');
  });
});

// ─── A9 — OC atrasadas ────────────────────────────────────────────────────────

describe('startAlertasJob — A9 OC atrasadas', () => {
  it('inclui seção de OC atrasadas no e-mail quando há OC com dataEntrega passada', async () => {
    const ontem = new Date(Date.now() - 86400000);
    mockOrdemCompra.mockResolvedValue([
      {
        codigo: 'OC-2026-001', status: 'pendente', dataEntrega: ontem,
        fornecedor: { razaoSocial: 'Fornecedor ABC' },
        _count: { itens: 3 },
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Ordens de Compra Atrasadas');
    expect(html).toContain('OC-2026-001');
    expect(html).toContain('Fornecedor ABC');
    expect(html).toContain('1d'); // 1 dia de atraso
  });

  it('OC atrasada contribui para totalCriticos — subject URGENTE', async () => {
    const ontem = new Date(Date.now() - 86400000);
    mockOrdemCompra.mockResolvedValue([
      {
        codigo: 'OC-2026-002', status: 'aprovada', dataEntrega: ontem,
        fornecedor: { razaoSocial: 'Fornecedor XYZ' },
        _count: { itens: 2 },
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).toContain('URGENTE');
    expect(subject).toContain('1 alerta(s) crítico(s)');
  });

  it('NÃO inclui seção quando não há OC atrasadas', async () => {
    // mockOrdemCompra já retorna [] por padrão no beforeEach
    // Disparar apenas com material abaixo do mínimo para ter e-mail mas sem OC
    mockMaterial.mockResolvedValue([
      { nome: 'Parafuso', codigo: 'MAT-001', unidadeMedida: 'un', estoqueMinimo: 5, ativo: true, estoques: [{ quantidade: 2 }] },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).not.toContain('Ordens de Compra Atrasadas');
  });
});

// ─── A10 — manutenção por km ──────────────────────────────────────────────────

describe('startAlertasJob — A10 manutenção por km', () => {
  it('inclui seção de manutenção por km quando há caminhão dentro da margem', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        id: 'cam-1', codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH',
        km_atual: 99500, proxima_manutencao_km: 100000, km_restantes: 500,
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Manutenção por KM');
    expect(html).toContain('CAM-001');
    expect(html).toContain('500');
  });

  it('caminhão com km ultrapassado aparece como VENCIDA! em vermelho', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        id: 'cam-2', codigo: 'CAM-002', placa: 'DEF5678', modelo: 'Mercedes',
        km_atual: 101000, proxima_manutencao_km: 100000, km_restantes: -1000,
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('VENCIDA!');
    expect(html).toContain('#dc2626'); // vermelho para urgente
  });

  it('contribui para totalCriticos quando km ultrapassado — subject URGENTE', async () => {
    mockQueryRaw.mockResolvedValue([
      {
        id: 'cam-3', codigo: 'CAM-003', placa: 'GHI9012', modelo: 'Scania',
        km_atual: 102000, proxima_manutencao_km: 100000, km_restantes: -2000,
      },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const subject = (mockSendEmail.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).toContain('URGENTE');
  });

  it('NÃO inclui seção quando nenhum caminhão está dentro da margem', async () => {
    // mockQueryRaw retorna [] por padrão — dispara e-mail via outro alerta
    mockMaterial.mockResolvedValue([
      { nome: 'Óleo', codigo: 'MAT-001', unidadeMedida: 'L', estoqueMinimo: 5, ativo: true, estoques: [{ quantidade: 1 }] },
    ]);

    const { startAlertasJob } = mockEnvAndImportJob('alerta@empresa.com');
    startAlertasJob();
    await flushPromises();

    const html = (mockSendEmail.mock.calls[0][0] as { html: string }).html;
    expect(html).not.toContain('Manutenção por KM');
  });
});
