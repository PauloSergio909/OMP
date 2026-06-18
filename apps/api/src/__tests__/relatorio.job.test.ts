import { buildHtmlRelatorio } from '../jobs/relatorio.job';

// buildHtmlRelatorio é uma função pura — não precisa de mocks
const dadosBase = {
  frotaKPIs:    { total: 10, operacionais: 8, manutencao: 2, manutencaoVencendo: 1 },
  osKPIs:       { abertas: 3, concluidasMes: 5, custoMes: 12000 },
  estoqueKPIs:  { total: 50, abaixoMinimo: 4 },
  comprasKPIs:  { pendentes: 2, aprovadas: 1 },
  osAbertasSemana:  [{ codigo: 'OS-2026-001', tipo: 'corretiva', prioridade: 'alta', caminhao: { codigo: 'CAM-001' } }],
  osConcluidas: [{ codigo: 'OS-2026-002', tipo: 'preventiva', custoTotal: 850.5, caminhao: { codigo: 'CAM-002' } }],
  abastecimentosMes: { _sum: { litros: 2400 }, _count: 12 },
  checklists:   { total: 8, aprovados: 7, reprovados: 1 },
  pneusKPIs:    { alertas80: 3, alertas95: 1 },
  manutencaoKm: [],
};

describe('buildHtmlRelatorio — estrutura do HTML', () => {
  it('contém as seções principais do relatório', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('Relatório Semanal');
    expect(html).toContain('Frota');
    expect(html).toContain('Ordens de Serviço');
    expect(html).toContain('Estoque &amp; Compras');
    expect(html).toContain('Checklists da Semana');
    expect(html).toContain('Pneus');
  });

  it('exibe os KPIs de frota corretamente', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('>10<');   // total frota
    expect(html).toContain('>8<');    // operacionais
    expect(html).toContain('>1<');    // manutencaoVencendo
  });

  it('exibe pneus com alertas80 e alertas95', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('Desgaste ≥ 80%');
    expect(html).toContain('Desgaste ≥ 95%');
    expect(html).toContain('>3<');   // alertas80
  });

  it('usa cor vermelha para alertas95 > 0', () => {
    const html = buildHtmlRelatorio(dadosBase);
    // alertas95=1 deve gerar cor de alerta #dc2626
    const idx = html.indexOf('Desgaste ≥ 95%');
    expect(html.substring(idx - 200, idx)).toContain('#dc2626');
  });

  it('usa cor verde para alertas95 = 0', () => {
    const html = buildHtmlRelatorio({ ...dadosBase, pneusKPIs: { alertas80: 0, alertas95: 0 } });
    const idx = html.indexOf('Desgaste ≥ 95%');
    expect(html.substring(idx - 200, idx)).toContain('#059669');
  });

  it('exibe a tabela de OS abertas na semana', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('OS-2026-001');
    expect(html).toContain('CAM-001');
    expect(html).toContain('corretiva');
  });

  it('exibe a tabela de OS concluídas na semana', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('OS-2026-002');
    expect(html).toContain('CAM-002');
    expect(html).toContain('850');
  });

  it('escapa caracteres especiais no HTML', () => {
    const dadosXSS = {
      ...dadosBase,
      osAbertasSemana: [{ codigo: '<b>XSS</b>', tipo: 'corretiva', prioridade: 'alta', caminhao: { codigo: 'CAM-1' } }],
    };
    const html = buildHtmlRelatorio(dadosXSS);
    expect(html).not.toContain('<b>XSS</b>');
    expect(html).toContain('&lt;b&gt;XSS&lt;/b&gt;');
  });

  it('osConcluidas com custoTotal null não quebra o HTML', () => {
    const dados = {
      ...dadosBase,
      osConcluidas: [{ codigo: 'OS-X', tipo: 'preventiva', custoTotal: null, caminhao: { codigo: 'CAM-X' } }],
    };
    expect(() => buildHtmlRelatorio(dados)).not.toThrow();
  });

  it('tabelas são omitidas quando arrays estão vazios', () => {
    const dados = { ...dadosBase, osAbertasSemana: [], osConcluidas: [] };
    const html = buildHtmlRelatorio(dados);
    expect(html).not.toContain('OS Abertas nesta semana');
    expect(html).not.toContain('OS Concluídas nesta semana');
  });

  it('seção km-manutenção aparece com tabela quando há caminhão próximo do limiar', () => {
    const dados = {
      ...dadosBase,
      manutencaoKm: [{ codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH', km_atual: 99500, km_restantes: 500, urgente: false }],
    };
    const html = buildHtmlRelatorio(dados);
    expect(html).toContain('Manutenção por KM');
    expect(html).toContain('CAM-001');
    expect(html).toContain('ABC1234');
    expect(html).toContain('500');   // km restantes
  });

  it('seção km-manutenção omitida quando array vazio', () => {
    const html = buildHtmlRelatorio({ ...dadosBase, manutencaoKm: [] });
    expect(html).not.toContain('Manutenção por KM');
  });

  it('exibe litros e contagem de abastecimentos do mês', () => {
    const html = buildHtmlRelatorio(dadosBase); // _sum.litros: 2400, _count: 12
    expect(html).toContain('>2400 L<');
    expect(html).toContain('>12 abastecimentos<');
  });

  it('exibe a seção de checklists da semana', () => {
    const html = buildHtmlRelatorio(dadosBase);
    expect(html).toContain('Checklists da Semana');
    expect(html).toContain('>Aprovados<');
    expect(html).toContain('>Reprovados<');
  });

  it('usa cor vermelha para checklists com reprovados > 0', () => {
    const html = buildHtmlRelatorio(dadosBase); // reprovados: 1 → #dc2626
    // value div: color:#dc2626;margin:4px 0">1
    expect(html).toContain('color:#dc2626;margin:4px 0">1');
  });

  it('usa cor verde para checklists com reprovados = 0', () => {
    const dados = { ...dadosBase, checklists: { total: 5, aprovados: 5, reprovados: 0 } };
    const html = buildHtmlRelatorio(dados);
    // Reprovados=0 → cor #059669; valor 0 — combinação única no HTML
    expect(html).toContain('color:#059669;margin:4px 0">0');
  });

  it('usa cor âmbar para OS abertas quando > 5', () => {
    const dados = { ...dadosBase, osKPIs: { abertas: 6, concluidasMes: 5, custoMes: 12000 } };
    const html = buildHtmlRelatorio(dados);
    expect(html).toContain('color:#d97706;margin:4px 0">6');
  });

  it('usa cor vermelha quando estoqueKPIs.abaixoMinimo > 0', () => {
    const html = buildHtmlRelatorio(dadosBase); // abaixoMinimo: 4 → #dc2626
    expect(html).toContain('color:#dc2626;margin:4px 0">4');
  });

  it('mostra "VENCIDA!" em vermelho para km-manutenção urgente', () => {
    const dados = {
      ...dadosBase,
      manutencaoKm: [{ codigo: 'CAM-001', placa: 'ABC1234', modelo: 'Volvo FH', km_atual: 101000, km_restantes: -1000, urgente: true }],
    };
    const html = buildHtmlRelatorio(dados);
    expect(html).toContain('VENCIDA!');
    expect(html).toContain('color:#dc2626');
  });

  it('escapa caracteres especiais na tabela de km-manutenção', () => {
    const dados = {
      ...dadosBase,
      manutencaoKm: [{ codigo: '<b>CAM</b>', placa: '<img src=x>', modelo: 'Volvo', km_atual: 99000, km_restantes: 500, urgente: false }],
    };
    const html = buildHtmlRelatorio(dados);
    expect(html).not.toContain('<b>CAM</b>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;b&gt;CAM&lt;/b&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
  });
});
