// Testes das features adicionadas nas sessões 39-40:
// F3 — status "orcamento" no fluxo de OS
// A1+A6 — OS preventiva concluída → agenda próxima manutenção
// duplicar, porStatus

jest.mock('../config/database', () => ({
  prisma: {
    ordemServico: {
      findFirst:          jest.fn(),
      findUniqueOrThrow:  jest.fn(),
      count:              jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { OrdemServicoService } from '../modules/ordem-servico/os.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';

const mockFindFirst         = prisma.ordemServico.findFirst as jest.Mock;
const mockFindUniqueOrThrow = prisma.ordemServico.findUniqueOrThrow as jest.Mock;
const mockCount             = prisma.ordemServico.count as jest.Mock;
const mockTransaction       = prisma.$transaction as jest.Mock;

const svc = new OrdemServicoService();
const ano = new Date().getFullYear();

beforeEach(() => { jest.clearAllMocks(); });

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTxStatus(statusAtual: string, tipo = 'corretiva', caminhaoId = 'cam-1') {
  return {
    ordemServico: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ status: statusAtual, tipo, caminhaoId }),
      update: jest.fn().mockResolvedValue({ id: 'os-1', caminhaoId, status: statusAtual }),
      count: jest.fn().mockResolvedValue(0), // sem outras OS abertas → restaurar caminhão
    },
    itemOS: { findMany: jest.fn().mockResolvedValue([]) },
    caminhao: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({ kmAtual: 120000, codigo: 'CAM-001' }),
    },
    historicoOS: { create: jest.fn().mockResolvedValue({}) },
  };
}

// ─── F3 — status "orcamento" ──────────────────────────────────────────────────

describe('OrdemServicoService.criar — F3 orcamento', () => {
  const inputOS = {
    caminhaoId: 'cam-1', tipo: 'corretiva', descricao: 'Orçar troca de embreagem',
    prioridade: 'media', responsavelId: 'func-1', dataPrevisao: '2026-09-01',
  };

  it('cria OS com status=orcamento quando criarComoOrcamento=true', async () => {
    mockFindFirst.mockResolvedValue(null);
    const txOSCreate = jest.fn().mockResolvedValue({
      id: 'os-1', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, ...inputOS,
    });
    const txCamUpdate = jest.fn();
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({ ordemServico: { create: txOSCreate }, caminhao: { update: txCamUpdate } }),
    );

    await svc.criar({ ...inputOS, criarComoOrcamento: true });

    expect(txOSCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'orcamento' }) }),
    );
  });

  it('NÃO coloca caminhão em manutenção quando OS corretiva é criada como orçamento', async () => {
    mockFindFirst.mockResolvedValue(null);
    const txOSCreate = jest.fn().mockResolvedValue({
      id: 'os-1', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, ...inputOS,
    });
    const txCamUpdate = jest.fn();
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({ ordemServico: { create: txOSCreate }, caminhao: { update: txCamUpdate } }),
    );

    await svc.criar({ ...inputOS, tipo: 'corretiva', criarComoOrcamento: true });

    expect(txCamUpdate).not.toHaveBeenCalled();
  });
});

describe('OrdemServicoService.atualizarStatus — F3 transições de orcamento', () => {
  it('permite orcamento → agendada', async () => {
    const tx = makeTxStatus('orcamento', 'preventiva');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'agendada');

    expect(tx.ordemServico.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'agendada' }) }),
    );
  });

  it('permite orcamento → cancelada', async () => {
    const tx = makeTxStatus('orcamento', 'preventiva');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'cancelada');

    expect(tx.ordemServico.update).toHaveBeenCalled();
  });

  it('lança AppError 422 para orcamento → em_andamento (transição inválida)', async () => {
    const tx = makeTxStatus('orcamento');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    const err = await svc.atualizarStatus('os-1', 'em_andamento').catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
  });

  it('coloca caminhão em manutenção quando orcamento corretivo é aprovado (→ agendada)', async () => {
    const tx = makeTxStatus('orcamento', 'corretiva');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'agendada');

    expect(tx.caminhao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cam-1' },
        data: { status: 'manutencao' },
      }),
    );
  });

  it('NÃO coloca caminhão em manutenção quando orcamento preventivo é aprovado', async () => {
    const tx = makeTxStatus('orcamento', 'preventiva');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'agendada');

    // caminhao.update só deve ser chamado para restaurar status (updateMany), não update direto
    const updateCalls = (tx.caminhao.update as jest.Mock).mock.calls;
    const chamouManutencao = updateCalls.some(
      (call) => call[0]?.data?.status === 'manutencao',
    );
    expect(chamouManutencao).toBe(false);
  });
});

// ─── A1+A6 — manutenção automática ao concluir OS preventiva ─────────────────

describe('OrdemServicoService.atualizarStatus — A1+A6 manutenção automática', () => {
  it('atualiza proximaManutencao (+90d) e proximaManutencaoKm (+10k) ao concluir OS preventiva', async () => {
    const tx = makeTxStatus('em_andamento', 'preventiva');
    tx.ordemServico.findUniqueOrThrow.mockResolvedValue({
      status: 'em_andamento', tipo: 'preventiva', caminhaoId: 'cam-1',
    });
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'concluida');

    const updateCalls = (tx.caminhao.update as jest.Mock).mock.calls;
    const manutencaoCall = updateCalls.find(
      (call) => call[0]?.data?.proximaManutencao !== undefined,
    );
    expect(manutencaoCall).toBeDefined();
    expect(manutencaoCall![0].data.proximaManutencaoKm).toBe(130000); // 120k + 10k
    expect(manutencaoCall![0].data.proximaManutencao).toBeInstanceOf(Date);
  });

  it('NÃO atualiza proximaManutencao ao concluir OS corretiva', async () => {
    const tx = makeTxStatus('em_andamento', 'corretiva');
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'concluida');

    const updateCalls = (tx.caminhao.update as jest.Mock).mock.calls;
    const manutencaoCall = updateCalls.find(
      (call) => call[0]?.data?.proximaManutencao !== undefined,
    );
    expect(manutencaoCall).toBeUndefined();
  });

  it('restaura caminhão para operacional quando não há outras OS abertas', async () => {
    const tx = makeTxStatus('em_andamento', 'corretiva');
    tx.ordemServico.count.mockResolvedValue(0); // nenhuma outra OS aberta
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'concluida');

    expect(tx.caminhao.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'manutencao' }),
        data: { status: 'operacional' },
      }),
    );
  });

  it('NÃO restaura caminhão quando há outras OS abertas', async () => {
    const tx = makeTxStatus('em_andamento', 'corretiva');
    tx.ordemServico.count.mockResolvedValue(2); // há 2 outras OS abertas
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) => fn(tx));

    await svc.atualizarStatus('os-1', 'concluida');

    expect(tx.caminhao.updateMany).not.toHaveBeenCalled();
  });
});

// ─── duplicar ────────────────────────────────────────────────────────────────

describe('OrdemServicoService.duplicar', () => {
  const osOriginal = {
    id: 'os-orig', codigo: `OS-${ano}-001`, caminhaoId: 'cam-1',
    tipo: 'preventiva', descricao: 'Revisão 50k', status: 'concluida',
    prioridade: 'normal', responsavelId: 'func-1', observacoes: null,
    itens: [
      { id: 'item-1', materialId: 'mat-1', quantidade: 2, precoUnitario: 50, tipo: 'pecas', descricao: null },
    ],
  };

  it('cria nova OS com código incrementado e status=agendada', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(osOriginal);
    mockFindFirst.mockResolvedValue({ codigo: `OS-${ano}-001` });

    const txOSCreate = jest.fn().mockResolvedValue({
      id: 'os-2', codigo: `OS-${ano}-002`, caminhao: { codigo: 'CAM-001' }, tipo: 'preventiva',
    });
    const txItemCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    const txHistCreate = jest.fn().mockResolvedValue({});
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({ ordemServico: { create: txOSCreate }, itemOS: { createMany: txItemCreateMany }, historicoOS: { create: txHistCreate } }),
    );

    await svc.duplicar('os-orig');

    expect(txOSCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'agendada',
          codigo: `OS-${ano}-002`,
          descricao: expect.stringContaining('[Cópia]'),
        }),
      }),
    );
  });

  it('copia os itens da OS original via createMany', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(osOriginal);
    mockFindFirst.mockResolvedValue(null);

    const txOSCreate = jest.fn().mockResolvedValue({
      id: 'os-2', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, tipo: 'preventiva',
    });
    const txItemCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({ ordemServico: { create: txOSCreate }, itemOS: { createMany: txItemCreateMany }, historicoOS: { create: jest.fn() } }),
    );

    await svc.duplicar('os-orig');

    expect(txItemCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ materialId: 'mat-1', quantidade: 2, precoUnitario: 50 }),
        ]),
      }),
    );
  });

  it('NÃO chama createMany quando OS original não tem itens', async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ ...osOriginal, itens: [] });
    mockFindFirst.mockResolvedValue(null);

    const txOSCreate = jest.fn().mockResolvedValue({
      id: 'os-2', codigo: `OS-${ano}-001`, caminhao: { codigo: 'CAM-001' }, tipo: 'preventiva',
    });
    const txItemCreateMany = jest.fn();
    mockTransaction.mockImplementation((fn: (tx: object) => Promise<unknown>) =>
      fn({ ordemServico: { create: txOSCreate }, itemOS: { createMany: txItemCreateMany }, historicoOS: { create: jest.fn() } }),
    );

    await svc.duplicar('os-orig');

    expect(txItemCreateMany).not.toHaveBeenCalled();
  });
});

// ─── porStatus ────────────────────────────────────────────────────────────────

describe('OrdemServicoService.porStatus', () => {
  it('retorna array com todos os 6 statuses e suas contagens', async () => {
    mockCount
      .mockResolvedValueOnce(2)   // orcamento
      .mockResolvedValueOnce(5)   // agendada
      .mockResolvedValueOnce(3)   // em_andamento
      .mockResolvedValueOnce(1)   // aguardando_peca
      .mockResolvedValueOnce(20)  // concluida
      .mockResolvedValueOnce(4);  // cancelada

    const result = await svc.porStatus();

    expect(result).toHaveLength(6);
    expect(result.find((r) => r.status === 'orcamento')?.total).toBe(2);
    expect(result.find((r) => r.status === 'agendada')?.total).toBe(5);
    expect(result.find((r) => r.status === 'concluida')?.total).toBe(20);
  });

  it('retorna total=0 para statuses sem OS', async () => {
    mockCount.mockResolvedValue(0);

    const result = await svc.porStatus();

    expect(result.every((r) => r.total === 0)).toBe(true);
  });
});
