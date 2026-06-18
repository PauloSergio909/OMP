import { prisma } from '../config/database';
import { env } from '../config/env';
import { sendEmail } from '../services/email.service';
import { logger } from '../utils/logger';

async function coletarAlertas() {
  const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const agora = new Date();
  const [cnhVencendo, manutencaoVencendo, estoqueAbaixoMinimo, documentosVencendo, pneusAlerta, manutencaoKm, ocAtrasadas] = await Promise.all([
    prisma.funcionario.findMany({
      where: {
        ativo: true,
        cargo: 'motorista',
        cnhValidade: { lte: em30Dias },
      },
      select: { nome: true, cnhCategoria: true, cnhValidade: true, telefone: true },
      orderBy: { cnhValidade: 'asc' },
    }),
    prisma.caminhao.findMany({
      where: {
        proximaManutencao: { lte: em30Dias },
        status: 'operacional',
      },
      select: { codigo: true, placa: true, modelo: true, proximaManutencao: true },
      orderBy: { proximaManutencao: 'asc' },
    }),
    prisma.material.findMany({
      where: { ativo: true },
      include: { estoques: { select: { quantidade: true } } },
    }).then((mats) =>
      mats.filter((m) => {
        const qty = m.estoques[0]?.quantidade ?? 0;
        return qty < m.estoqueMinimo;
      }).map((m) => ({
        nome: m.nome,
        codigo: m.codigo,
        unidade: m.unidadeMedida,
        atual: m.estoques[0]?.quantidade ?? 0,
        minimo: m.estoqueMinimo,
      }))
    ),
    prisma.caminhao.findMany({
      where: {
        OR: [
          { vencimentoCrlv: { lte: em30Dias } },
          { vencimentoSeguro: { lte: em30Dias } },
        ],
        status: { not: 'parado' },
      },
      select: { codigo: true, placa: true, modelo: true, vencimentoCrlv: true, vencimentoSeguro: true },
      orderBy: { vencimentoCrlv: 'asc' },
    }),
    // A8 — Pneus com 80%+ de vida útil
    prisma.pneu.findMany({
      where: { status: 'ativo' },
      select: {
        id: true, posicao: true, marca: true, modelo: true,
        kmInstalacao: true, kmVidaUtil: true,
        caminhao: { select: { codigo: true, placa: true, kmAtual: true } },
      },
    }).then((pneus) =>
      pneus
        .map((p) => ({
          ...p,
          kmRodados: Math.max(0, p.caminhao.kmAtual - p.kmInstalacao),
          pctVida: Math.min(100, Math.round((Math.max(0, p.caminhao.kmAtual - p.kmInstalacao) / p.kmVidaUtil) * 100)),
        }))
        .filter((p) => p.pctVida >= 80)
        .sort((a, b) => b.pctVida - a.pctVida)
    ),
    // A10 — Caminhões dentro de 1000 km do limiar de manutenção por KM
    prisma.$queryRaw<Array<{
      id: string; codigo: string; placa: string; modelo: string;
      km_atual: number; proxima_manutencao_km: number; km_restantes: number;
    }>>`
      SELECT c.id, c.codigo, c.placa, c.modelo, c.km_atual, c.proxima_manutencao_km,
             (c.proxima_manutencao_km - c.km_atual) AS km_restantes
      FROM caminhoes c
      WHERE c.status = 'operacional'
        AND c.proxima_manutencao_km IS NOT NULL
        AND (c.proxima_manutencao_km - c.km_atual) <= 1000
      ORDER BY (c.proxima_manutencao_km - c.km_atual) ASC
    `.then((rows) => rows.map((r) => ({
      id: r.id, codigo: r.codigo, placa: r.placa, modelo: r.modelo,
      kmAtual: r.km_atual, proximaManutencaoKm: r.proxima_manutencao_km,
      kmRestantes: r.km_restantes,
      urgente: r.km_restantes <= 0,
    }))),

    // A9 — OC atrasadas (pendente/aprovada com dataEntrega < agora)
    prisma.ordemCompra.findMany({
      where: {
        status: { in: ['pendente', 'aprovada'] },
        dataEntrega: { lt: agora, not: null },
      },
      select: {
        codigo: true, status: true, dataEntrega: true,
        fornecedor: { select: { razaoSocial: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { dataEntrega: 'asc' },
    }),
  ]);

  return { cnhVencendo, manutencaoVencendo, estoqueAbaixoMinimo, documentosVencendo, pneusAlerta, ocAtrasadas, manutencaoKm };
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildHtml(alertas: Awaited<ReturnType<typeof coletarAlertas>>): string {
  const { cnhVencendo, manutencaoVencendo, estoqueAbaixoMinimo, documentosVencendo, pneusAlerta, ocAtrasadas, manutencaoKm } = alertas;

  const fmt = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const cnhRows = cnhVencendo
    .map((f) => `<tr><td>${esc(f.nome)}</td><td>${esc(f.cnhCategoria ?? '—')}</td><td>${fmt(f.cnhValidade)}</td><td>${esc(f.telefone)}</td></tr>`)
    .join('');

  const manRows = manutencaoVencendo
    .map((c) => `<tr><td>${esc(c.codigo)}</td><td>${esc(c.placa)}</td><td>${esc(c.modelo)}</td><td>${fmt(c.proximaManutencao)}</td></tr>`)
    .join('');

  const estRows = estoqueAbaixoMinimo
    .map((m) => `<tr><td>${esc(m.codigo)}</td><td>${esc(m.nome)}</td><td>${m.atual} ${esc(m.unidade)}</td><td>${m.minimo} ${esc(m.unidade)}</td></tr>`)
    .join('');

  const docRows = documentosVencendo
    .map((c) => `<tr><td>${esc(c.codigo)}</td><td>${esc(c.placa)}</td><td>${esc(c.modelo)}</td><td>${fmt(c.vencimentoCrlv)}</td><td>${fmt(c.vencimentoSeguro)}</td></tr>`)
    .join('');

  // A8 — Pneus próximos do fim da vida útil
  const pneuRows = pneusAlerta
    .map((p) => `<tr><td>${esc(p.caminhao.codigo)}</td><td>${esc(p.posicao)}</td><td>${esc(p.marca)} ${esc(p.modelo)}</td><td>${p.kmRodados.toLocaleString('pt-BR')} km</td><td style="font-weight:bold;color:${p.pctVida >= 95 ? '#dc2626' : '#d97706'}">${p.pctVida}%</td></tr>`)
    .join('');

  // A10 — Caminhões próximos do km de manutenção
  const kmManutRows = manutencaoKm
    .map((c) => `<tr><td>${esc(c.codigo)}</td><td>${esc(c.placa)}</td><td>${esc(c.modelo)}</td><td>${c.kmAtual.toLocaleString('pt-BR')} km</td><td style="font-weight:bold;color:${c.urgente ? '#dc2626' : '#d97706'}">${c.urgente ? 'VENCIDA!' : `${c.kmRestantes.toLocaleString('pt-BR')} km`}</td></tr>`)
    .join('');

  // A9 — OC atrasadas
  const ocRows = ocAtrasadas
    .map((oc) => {
      const diasAtraso = Math.ceil((Date.now() - new Date(oc.dataEntrega!).getTime()) / 86400000);
      return `<tr><td>${esc(oc.codigo)}</td><td>${esc(oc.fornecedor?.razaoSocial)}</td><td>${esc(oc.status)}</td><td>${oc._count.itens} iten(s)</td><td style="color:#dc2626;font-weight:bold">${diasAtraso}d</td></tr>`;
    })
    .join('');

  if (!cnhRows && !manRows && !estRows && !docRows && !pneuRows && !ocRows && !kmManutRows) return '';

  const section = (title: string, headers: string[], rows: string) =>
    rows
      ? `<h2 style="color:#1e40af;margin-top:24px">${title}</h2>
         <table style="border-collapse:collapse;width:100%;font-size:14px">
           <thead><tr style="background:#eff6ff">${headers.map((h) => `<th style="padding:8px;border:1px solid #bfdbfe;text-align:left">${h}</th>`).join('')}</tr></thead>
           <tbody>${rows}</tbody>
         </table>`
      : '';

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1f2937;max-width:800px;margin:0 auto;padding:16px">
    <h1 style="color:#1e3a5f">FleetMaster — Alertas do Sistema</h1>
    <p style="color:#6b7280">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    ${section('CNH Vencendo (próximos 30 dias)', ['Motorista', 'Categoria', 'Validade', 'Telefone'], cnhRows)}
    ${section('Manutenções Vencendo (próximos 30 dias)', ['Código', 'Placa', 'Modelo', 'Próxima Manutenção'], manRows)}
    ${section('Estoque Abaixo do Mínimo', ['Código', 'Material', 'Estoque Atual', 'Mínimo'], estRows)}
    ${section('Documentos Vencendo (próximos 30 dias)', ['Código', 'Placa', 'Modelo', 'Venc. CRLV', 'Venc. Seguro'], docRows)}
    ${section('Pneus com Vida Útil Avançada (≥80%)', ['Caminhão', 'Posição', 'Marca/Modelo', 'KM Rodados', 'Vida Útil'], pneuRows)}
    ${section('Ordens de Compra Atrasadas', ['Código', 'Fornecedor', 'Status', 'Itens', 'Atraso'], ocRows)}
    ${section('Manutenção por KM (próximos 1000 km)', ['Caminhão', 'Placa', 'Modelo', 'KM Atual', 'KM Restante'], kmManutRows)}
  </body></html>`;
}

// A3 — Detecta alertas críticos (vencidos, não apenas vencendo)
function detectarCriticos(alertas: Awaited<ReturnType<typeof coletarAlertas>>) {
  const hoje = new Date();
  const cnhVencidas = alertas.cnhVencendo.filter((f) => f.cnhValidade && new Date(f.cnhValidade) < hoje).length;
  const manutencaoVencida = alertas.manutencaoVencendo.filter((c) => c.proximaManutencao && new Date(c.proximaManutencao) < hoje).length;
  const docsVencidos = alertas.documentosVencendo.filter((c) => {
    const crlvVencido = c.vencimentoCrlv && new Date(c.vencimentoCrlv) < hoje;
    const seguroVencido = c.vencimentoSeguro && new Date(c.vencimentoSeguro) < hoje;
    return crlvVencido || seguroVencido;
  }).length;
  const pneusUrgentes = alertas.pneusAlerta.filter((p) => p.pctVida >= 95).length;
  const ocAtrasadasCount = alertas.ocAtrasadas.length;
  const kmManutUrgentes = alertas.manutencaoKm.filter((c) => c.urgente).length;
  return { cnhVencidas, manutencaoVencida, docsVencidos, pneusUrgentes, ocAtrasadasCount, kmManutUrgentes };
}

async function executarJob() {
  if (!env.ALERTAS_EMAIL_DEST) return;

  try {
    const alertas = await coletarAlertas();
    const html = buildHtml(alertas);

    if (!html) {
      logger.info('Job de alertas: nenhum alerta ativo, e-mail não enviado');
      return;
    }

    // A3 — Subject urgente se há alertas críticos vencidos
    const criticos = detectarCriticos(alertas);
    const totalCriticos = criticos.cnhVencidas + criticos.manutencaoVencida + criticos.docsVencidos + criticos.pneusUrgentes + criticos.ocAtrasadasCount + criticos.kmManutUrgentes;
    const subject = totalCriticos > 0
      ? `🚨 URGENTE — FleetMaster: ${totalCriticos} alerta(s) crítico(s) — ${new Date().toLocaleDateString('pt-BR')}`
      : `FleetMaster — Alertas ${new Date().toLocaleDateString('pt-BR')}`;

    await sendEmail({ to: env.ALERTAS_EMAIL_DEST, subject, html });
    logger.info(`Job de alertas enviado para ${env.ALERTAS_EMAIL_DEST} (${totalCriticos > 0 ? `${totalCriticos} crítico(s)` : 'nenhum crítico'})`);
  } catch (err) {
    logger.error('Falha no job de alertas', { err });
  }
}

export function startAlertasJob() {
  if (!env.ALERTAS_EMAIL_DEST) {
    logger.info('ALERTAS_EMAIL_DEST não definido — job de alertas desativado');
    return;
  }

  const intervaloMs = env.ALERTAS_INTERVALO_HORAS * 60 * 60 * 1000;
  logger.info(`Job de alertas agendado a cada ${env.ALERTAS_INTERVALO_HORAS}h para ${env.ALERTAS_EMAIL_DEST}`);

  executarJob();
  setInterval(executarJob, intervaloMs);
}
