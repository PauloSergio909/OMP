import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendEmail } from '../services/email.service';
import { logger } from '../utils/logger';

const esc = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function coletarDadosRelatorio() {
  const hoje = new Date();
  const inicioSemana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [
    frotaKPIs, osKPIs, estoqueKPIs, comprasKPIs,
    osAbertasSemana, osConcluidas,
    abastecimentosMes, checklists, manutencaoKm, pneusKPIs,
  ] = await Promise.all([
    // Frota
    Promise.all([
      prisma.caminhao.count(),
      prisma.caminhao.count({ where: { status: 'operacional' } }),
      prisma.caminhao.count({ where: { status: 'manutencao' } }),
      prisma.caminhao.count({ where: { status: 'operacional', proximaManutencao: { lte: new Date(Date.now() + 30 * 86400000) } } }),
    ]).then(([total, operacionais, manutencao, manutencaoVencendo]) => ({ total, operacionais, manutencao, manutencaoVencendo })),

    // OS
    Promise.all([
      prisma.ordemServico.count({ where: { status: { notIn: ['concluida', 'cancelada'] } } }),
      prisma.ordemServico.count({ where: { status: 'concluida', dataConclusao: { gte: inicioMes } } }),
      prisma.ordemServico.aggregate({ where: { status: 'concluida', dataConclusao: { gte: inicioMes } }, _sum: { custoTotal: true } }),
    ]).then(([abertas, concluidasMes, custo]) => ({ abertas, concluidasMes, custoMes: custo._sum.custoTotal ?? 0 })),

    // Estoque — raw SQL para evitar carregar todos os materiais em memória
    Promise.all([
      prisma.material.count({ where: { ativo: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) FROM materiais m
        LEFT JOIN estoques e ON e.material_id = m.id
        WHERE m.ativo = true AND COALESCE(e.quantidade, 0) < m.estoque_minimo
      `.then(([r]) => Number(r.count)),
    ]).then(([total, abaixoMinimo]) => ({ total, abaixoMinimo })),

    // Compras
    Promise.all([
      prisma.ordemCompra.count({ where: { status: 'pendente' } }),
      prisma.ordemCompra.count({ where: { status: 'aprovada' } }),
    ]).then(([pendentes, aprovadas]) => ({ pendentes, aprovadas })),

    // OS abertas nesta semana
    prisma.ordemServico.findMany({
      where: { dataAbertura: { gte: inicioSemana }, status: { notIn: ['concluida', 'cancelada'] } },
      select: { codigo: true, tipo: true, prioridade: true, caminhao: { select: { codigo: true } } },
      orderBy: { dataAbertura: 'desc' },
      take: 10,
    }),

    // OS concluídas nesta semana
    prisma.ordemServico.findMany({
      where: { dataConclusao: { gte: inicioSemana }, status: 'concluida' },
      select: { codigo: true, tipo: true, custoTotal: true, caminhao: { select: { codigo: true } } },
      orderBy: { dataConclusao: 'desc' },
      take: 10,
    }),

    // Abastecimentos do mês
    prisma.abastecimento.aggregate({
      where: { data: { gte: inicioMes } },
      _sum: { litros: true },
      _count: true,
    }),

    // Checklists da semana
    Promise.all([
      prisma.checklistVistoria.count({ where: { createdAt: { gte: inicioSemana } } }),
      prisma.checklistVistoria.count({ where: { createdAt: { gte: inicioSemana }, aprovado: true } }),
    ]).then(([total, aprovados]) => ({ total, aprovados, reprovados: total - aprovados })),

    // Caminhões próximos do km de manutenção (margem 1000 km)
    prisma.$queryRaw<Array<{ codigo: string; placa: string; modelo: string; km_atual: number; km_restantes: number }>>`
      SELECT c.codigo, c.placa, c.modelo, c.km_atual,
             (c.proxima_manutencao_km - c.km_atual) AS km_restantes
      FROM caminhoes c
      WHERE c.status = 'operacional'
        AND c.proxima_manutencao_km IS NOT NULL
        AND (c.proxima_manutencao_km - c.km_atual) <= 1000
      ORDER BY (c.proxima_manutencao_km - c.km_atual) ASC
    `.then((rows) => rows.map((r) => ({ ...r, urgente: r.km_restantes <= 0 }))),

    // Pneus com desgaste avançado — reutiliza mesma query do PneusService.getKPIsGlobal
    prisma.$queryRaw<[{ alertas80: bigint; alertas95: bigint }]>`
      SELECT
        COUNT(*) FILTER (
          WHERE p.status = 'ativo'
            AND LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
                / p.km_vida_util * 100)) >= 80
        ) AS alertas80,
        COUNT(*) FILTER (
          WHERE p.status = 'ativo'
            AND LEAST(100, ROUND(GREATEST(0, c.km_atual - p.km_instalacao)::numeric
                / p.km_vida_util * 100)) >= 95
        ) AS alertas95
      FROM pneus p
      LEFT JOIN caminhoes c ON c.id = p.caminhao_id
    `.then(([r]) => ({ alertas80: Number(r.alertas80), alertas95: Number(r.alertas95) })),
  ]);

  return { frotaKPIs, osKPIs, estoqueKPIs, comprasKPIs, osAbertasSemana, osConcluidas, abastecimentosMes, checklists, pneusKPIs, manutencaoKm };
}

export function buildHtmlRelatorio(dados: Awaited<ReturnType<typeof coletarDadosRelatorio>>): string {
  const { frotaKPIs, osKPIs, estoqueKPIs, comprasKPIs, osAbertasSemana, osConcluidas, abastecimentosMes, checklists, pneusKPIs, manutencaoKm } = dados;
  const hoje = new Date();

  const kpiCard = (label: string, value: string | number, sub?: string, cor = '#1e40af') =>
    `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;flex:1;min-width:120px">
      <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${esc(label)}</div>
      <div style="font-size:24px;font-weight:700;color:${cor};margin:4px 0">${esc(value)}</div>
      ${sub ? `<div style="font-size:11px;color:#9ca3af">${esc(sub)}</div>` : ''}
    </div>`;

  const tableSection = (title: string, headers: string[], rows: string) =>
    rows ? `<h2 style="color:#1e40af;margin-top:24px;font-size:14px">${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:12px;margin-top:8px">
      <thead><tr style="background:#eff6ff">${headers.map((h) => `<th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '';

  const osAbertasRows = osAbertasSemana
    .map((os) => `<tr><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.codigo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.caminhao?.codigo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.tipo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.prioridade)}</td></tr>`)
    .join('');

  const osConcluidasRows = osConcluidas
    .map((os) => `<tr><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.codigo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(os.caminhao?.codigo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">R$ ${((os.custoTotal ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`)
    .join('');

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:800px;margin:0 auto;padding:16px">
  <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">FleetMaster — Relatório Semanal</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Semana encerrada em ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>

  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Frota</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    ${kpiCard('Total', frotaKPIs.total)}
    ${kpiCard('Operacionais', frotaKPIs.operacionais, `${frotaKPIs.manutencao} em manutenção`, '#059669')}
    ${kpiCard('Manutenção vencendo', frotaKPIs.manutencaoVencendo, 'próximos 30 dias', frotaKPIs.manutencaoVencendo > 0 ? '#d97706' : '#059669')}
  </div>

  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Ordens de Serviço</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    ${kpiCard('Abertas', osKPIs.abertas, 'no momento', osKPIs.abertas > 5 ? '#d97706' : '#059669')}
    ${kpiCard('Concluídas (mês)', osKPIs.concluidasMes)}
    ${kpiCard('Custo OS (mês)', `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k`)}
  </div>

  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Estoque & Compras</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    ${kpiCard('Materiais ativos', estoqueKPIs.total)}
    ${kpiCard('Abaixo do mínimo', estoqueKPIs.abaixoMinimo, 'precisam reposição', estoqueKPIs.abaixoMinimo > 0 ? '#dc2626' : '#059669')}
    ${kpiCard('OCs pendentes', comprasKPIs.pendentes, `${comprasKPIs.aprovadas} aprovadas`)}
    ${kpiCard('Litros (mês)', `${(abastecimentosMes._sum.litros ?? 0).toFixed(0)} L`, `${abastecimentosMes._count} abastecimentos`)}
  </div>

  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Checklists da Semana</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    ${kpiCard('Total', checklists.total)}
    ${kpiCard('Aprovados', checklists.aprovados, undefined, '#059669')}
    ${kpiCard('Reprovados', checklists.reprovados, 'geraram OS automáticas', checklists.reprovados > 0 ? '#dc2626' : '#059669')}
  </div>

  ${manutencaoKm.length > 0 ? `
  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Manutenção por KM (próximos 1000 km)</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
    ${kpiCard('Próximos do limiar', manutencaoKm.length, `${manutencaoKm.filter((c) => c.urgente).length} com km vencido`, manutencaoKm.some((c) => c.urgente) ? '#dc2626' : '#d97706')}
  </div>
  <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#eff6ff"><th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">Caminhão</th><th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">Placa</th><th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">Modelo</th><th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">KM Atual</th><th style="padding:6px 10px;border:1px solid #bfdbfe;text-align:left">KM Restante</th></tr></thead>
    <tbody>${manutencaoKm.map((c) => `<tr><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(c.codigo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(c.placa)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${esc(c.modelo)}</td><td style="padding:5px 10px;border:1px solid #f3f4f6">${c.km_atual.toLocaleString('pt-BR')} km</td><td style="padding:5px 10px;border:1px solid #f3f4f6;font-weight:bold;color:${c.urgente ? '#dc2626' : '#d97706'}">${c.urgente ? 'VENCIDA!' : `${c.km_restantes.toLocaleString('pt-BR')} km`}</td></tr>`).join('')}</tbody>
  </table>
  ` : ''}

  <h2 style="color:#1e40af;font-size:14px;margin-bottom:8px">Pneus</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    ${kpiCard('Desgaste ≥ 80%', pneusKPIs.alertas80, 'precisam atenção', pneusKPIs.alertas80 > 0 ? '#d97706' : '#059669')}
    ${kpiCard('Desgaste ≥ 95%', pneusKPIs.alertas95, 'substituição urgente', pneusKPIs.alertas95 > 0 ? '#dc2626' : '#059669')}
  </div>

  ${tableSection('OS Abertas nesta semana', ['Código', 'Caminhão', 'Tipo', 'Prioridade'], osAbertasRows)}
  ${tableSection('OS Concluídas nesta semana', ['Código', 'Caminhão', 'Custo'], osConcluidasRows)}

  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between">
    <span>FleetMaster — Sistema de Gestão de Frota</span>
    <span>Gerado em ${hoje.toLocaleString('pt-BR')}</span>
  </div>
</body></html>`;
}

async function executarRelatorio() {
  if (!env.ALERTAS_EMAIL_DEST) return;

  try {
    const dados = await coletarDadosRelatorio();
    const html = buildHtmlRelatorio(dados);

    await sendEmail({
      to: env.ALERTAS_EMAIL_DEST,
      subject: `FleetMaster — Relatório Semanal ${new Date().toLocaleDateString('pt-BR')}`,
      html,
    });
    logger.info(`Relatório semanal enviado para ${env.ALERTAS_EMAIL_DEST}`);
  } catch (err) {
    logger.error('Falha no job de relatório semanal', { err });
  }
}

export function startRelatorioJob() {
  if (!env.ALERTAS_EMAIL_DEST) return;

  // Executa uma vez na inicialização e depois toda semana (7 dias em ms)
  const semanaMs = 7 * 24 * 60 * 60 * 1000;
  logger.info(`Job de relatório semanal agendado para ${env.ALERTAS_EMAIL_DEST}`);

  // Agenda para a próxima segunda-feira às 07h
  const agora = new Date();
  const diasParaSegunda = (1 - agora.getDay() + 7) % 7 || 7;
  const proximaSegunda = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + diasParaSegunda, 7, 0, 0);
  const delayInicial = proximaSegunda.getTime() - agora.getTime();

  setTimeout(() => {
    executarRelatorio();
    setInterval(executarRelatorio, semanaMs);
  }, delayInicial);
}
