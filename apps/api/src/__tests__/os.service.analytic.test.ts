// Testes dos métodos analíticos de OS que usam $queryRaw: tempoMedioResolucao

jest.mock('../config/database', () => ({
  prisma: {
    ordemServico: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { OrdemServicoService } from '../modules/ordem-servico/os.service';
import { prisma } from '../config/database';

const mockQueryRaw = prisma.$queryRaw as jest.Mock;

const svc = new OrdemServicoService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── tempoMedioResolucao ──────────────────────────────────────────────────────

describe('OrdemServicoService.tempoMedioResolucao', () => {
  it('retorna mediaDias e porTipo com dados reais', async () => {
    // Primeira chamada: Promise.all com 1 query → retorna [rows]
    // rows = [{ media_dias: 2.5, total: 10 }]
    mockQueryRaw
      .mockResolvedValueOnce([{ media_dias: 2.5, total: 10 }])   // global
      .mockResolvedValueOnce([                                      // por tipo
        { tipo: 'preventiva', media: 1.5, total: 7 },
        { tipo: 'corretiva',  media: 3.5, total: 3 },
      ]);

    const result = await svc.tempoMedioResolucao();

    expect(result.mediaDias).toBe(2.5);
    expect(result.totalConcluidas).toBe(10);
    expect(result.porTipo).toHaveLength(2);

    const preventiva = result.porTipo.find((r) => r.tipo === 'preventiva')!;
    expect(preventiva.mediaDias).toBe(1.5);
    expect(preventiva.total).toBe(7);

    const corretiva = result.porTipo.find((r) => r.tipo === 'corretiva')!;
    expect(corretiva.mediaDias).toBe(3.5);
  });

  it('retorna mediaDias=null quando não há OS concluídas', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ media_dias: null, total: 0 }])
      .mockResolvedValueOnce([]);

    const result = await svc.tempoMedioResolucao();

    expect(result.mediaDias).toBeNull();
    expect(result.totalConcluidas).toBe(0);
    expect(result.porTipo).toHaveLength(0);
  });

  it('arredonda mediaDias para 1 casa decimal', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ media_dias: 3.14159, total: 5 }])
      .mockResolvedValueOnce([{ tipo: 'preventiva', media: 2.66666, total: 5 }]);

    const result = await svc.tempoMedioResolucao();

    expect(result.mediaDias).toBe(3.1);
    expect(result.porTipo[0].mediaDias).toBe(2.7);
  });

  it('mediaDias=null por tipo quando média do tipo é null', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([{ media_dias: 1.0, total: 1 }])
      .mockResolvedValueOnce([{ tipo: 'preventiva', media: null, total: 1 }]);

    const result = await svc.tempoMedioResolucao();

    expect(result.porTipo[0].mediaDias).toBeNull();
  });

  it('totalConcluidas=0 quando rows está vazio (tabela vazia)', async () => {
    // rows vazio — rows[0] é undefined
    mockQueryRaw
      .mockResolvedValueOnce([])   // nenhuma row
      .mockResolvedValueOnce([]);

    const result = await svc.tempoMedioResolucao();

    expect(result.mediaDias).toBeNull();   // row?.media_dias ?? null → null
    expect(result.totalConcluidas).toBe(0); // row?.total ?? 0 → 0
  });
});

// ─── tendenciaMensal ──────────────────────────────────────────────────────────

describe('OrdemServicoService.tendenciaMensal', () => {
  // Helper: gera chave YYYY-MM para N meses atrás
  function mesAtras(n: number): string {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - n, 1);
    return d.toISOString().substring(0, 7);
  }

  it('retorna exatamente 6 entradas por padrão', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])  // abertasRows
      .mockResolvedValueOnce([]); // concluidasRows

    const result = await svc.tendenciaMensal();

    expect(result).toHaveLength(6);
  });

  it('respeita o parâmetro meses', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await svc.tendenciaMensal(3);

    expect(result).toHaveLength(3);
  });

  it('preenche meses sem dados com abertas=0, concluidas=0, custo=0', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await svc.tendenciaMensal(3);

    for (const entry of result) {
      expect(entry.abertas).toBe(0);
      expect(entry.concluidas).toBe(0);
      expect(entry.custo).toBe(0);
    }
  });

  it('injeta dados corretos quando rows batem com o mês', async () => {
    const mesAtual = mesAtras(0);
    const mesAnterior = mesAtras(1);

    mockQueryRaw
      .mockResolvedValueOnce([
        { mes_inicio: new Date(`${mesAtual}-01T00:00:00Z`), total: 8 },
        { mes_inicio: new Date(`${mesAnterior}-01T00:00:00Z`), total: 5 },
      ])
      .mockResolvedValueOnce([
        { mes_inicio: new Date(`${mesAtual}-01T00:00:00Z`), total: 3, custo: 1500.555 },
      ]);

    const result = await svc.tendenciaMensal(2);

    const atual = result[result.length - 1]; // último = mês atual
    expect(atual.abertas).toBe(8);
    expect(atual.concluidas).toBe(3);
    expect(atual.custo).toBe(1500.56); // arredondado para 2 casas

    const anterior = result[result.length - 2];
    expect(anterior.abertas).toBe(5);
    expect(anterior.concluidas).toBe(0); // não estava em concluidasRows
  });

  it('arredonda custo para 2 casas decimais', async () => {
    const mesAtual = mesAtras(0);

    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { mes_inicio: new Date(`${mesAtual}-01T00:00:00Z`), total: 1, custo: 999.999 },
      ]);

    const result = await svc.tendenciaMensal(1);

    expect(result[0].custo).toBe(1000); // Math.round(999.999 * 100) / 100 = 1000
  });

  it('cada entrada tem propriedade mes formatada (mês abrev + ano 2d)', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await svc.tendenciaMensal(1);

    // Exemplo: 'jun. 26' ou 'jan. 26' — string não-vazia
    expect(typeof result[0].mes).toBe('string');
    expect(result[0].mes.length).toBeGreaterThan(3);
  });
});
