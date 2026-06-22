import { esc, field } from './printDocument';

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function buildOSHtml(os: {
  codigo: string; tipo: string; status: string; prioridade: string;
  dataAbertura: string; dataPrevisao?: string | null; dataConclusao?: string | null;
  descricao?: string; observacoes?: string;
  caminhao: { codigo: string; placa: string; modelo: string } | null;
  responsavel: { nome: string; cargo?: string } | null;
  itens: { tipo: string; descricao?: string; quantidade: number; precoUnitario: number; material?: { nome: string; codigo?: string; unidadeMedida: string } | null }[];
}) {
  const itensRows = os.itens.map((it) => {
    const desc = it.material ? `${esc(it.material.nome)} (${esc(it.material.codigo ?? '')})` : esc(it.descricao ?? '—');
    const total = it.quantidade * it.precoUnitario;
    return `<tr>
      <td>${it.tipo === 'material' ? 'Material' : 'Serviço'}</td>
      <td>${desc}</td>
      <td>${it.quantidade} ${esc(it.material?.unidadeMedida ?? 'un')}</td>
      <td>${money(it.precoUnitario)}</td>
      <td>${money(total)}</td>
    </tr>`;
  }).join('');

  const valorTotal = os.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);

  return `
    <div class="header">
      <div class="header-left">
        <h1>Ordem de Serviço — ${esc(os.codigo)}</h1>
        <p>Tipo: ${esc(os.tipo.replace('_', ' '))} &nbsp;|&nbsp; Prioridade: ${esc(os.prioridade)}</p>
      </div>
      <span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">${esc(os.status.replace('_', ' '))}</span>
    </div>

    <h2>Veículo e Responsável</h2>
    <div class="grid-2">
      ${field('Código / Placa', os.caminhao ? `${esc(os.caminhao.codigo)} / ${esc(os.caminhao.placa)}` : '—')}
      ${field('Modelo', esc(os.caminhao?.modelo ?? '—'))}
      ${field('Responsável', esc(os.responsavel?.nome ?? '—'))}
      ${field('Cargo', esc(os.responsavel?.cargo ?? '—'))}
    </div>

    <h2>Datas</h2>
    <div class="grid-2">
      ${field('Abertura', fmt(os.dataAbertura))}
      ${field('Previsão', fmt(os.dataPrevisao))}
      ${field('Conclusão', fmt(os.dataConclusao))}
    </div>

    ${os.descricao ? `<h2>Descrição</h2><p style="margin-bottom:16px">${esc(os.descricao)}</p>` : ''}

    <h2>Itens</h2>
    <table>
      <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Total</th></tr></thead>
      <tbody>
        ${itensRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Nenhum item</td></tr>'}
        <tr class="total-row"><td colspan="4">Total</td><td>${money(valorTotal)}</td></tr>
      </tbody>
    </table>

    ${os.observacoes ? `<h2>Observações</h2><p>${esc(os.observacoes)}</p>` : ''}

    <div class="footer">
      <span>Controle OMP — Sistema de Gestão de Frota</span>
      <span>Impresso em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

export function buildOCHtml(oc: {
  codigo: string; status: string;
  dataPedido: string; dataEntrega?: string | null; dataRecebimento?: string | null;
  observacoes?: string;
  fornecedor: { razaoSocial: string; cnpj?: string; telefone?: string; email?: string; endereco?: string };
  itens: { quantidade: number; precoUnitario: number; material: { nome: string; codigo: string; unidadeMedida: string } }[];
  valorTotal?: number;
}) {
  const itensRows = oc.itens.map((it) => {
    const total = it.quantidade * it.precoUnitario;
    return `<tr>
      <td>${esc(it.material.codigo)}</td>
      <td>${esc(it.material.nome)}</td>
      <td>${it.quantidade} ${esc(it.material.unidadeMedida)}</td>
      <td>${money(it.precoUnitario)}</td>
      <td>${money(total)}</td>
    </tr>`;
  }).join('');

  const valorTotal = oc.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);

  return `
    <div class="header">
      <div class="header-left">
        <h1>Ordem de Compra — ${esc(oc.codigo)}</h1>
        <p>Pedido: ${fmt(oc.dataPedido)}</p>
      </div>
      <span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">${esc(oc.status)}</span>
    </div>

    <h2>Fornecedor</h2>
    <div class="grid-2">
      ${field('Razão Social', esc(oc.fornecedor.razaoSocial))}
      ${field('CNPJ', esc(oc.fornecedor.cnpj ?? '—'))}
      ${field('Telefone', esc(oc.fornecedor.telefone ?? '—'))}
      ${field('E-mail', esc(oc.fornecedor.email ?? '—'))}
    </div>

    <h2>Datas</h2>
    <div class="grid-2">
      ${field('Pedido', fmt(oc.dataPedido))}
      ${field('Entrega prevista', fmt(oc.dataEntrega))}
      ${field('Data de recebimento', fmt(oc.dataRecebimento))}
    </div>

    <h2>Itens</h2>
    <table>
      <thead><tr><th>Código</th><th>Material</th><th>Qtd</th><th>Preço Unit.</th><th>Total</th></tr></thead>
      <tbody>
        ${itensRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Nenhum item</td></tr>'}
        <tr class="total-row"><td colspan="4">Total</td><td>${money(valorTotal)}</td></tr>
      </tbody>
    </table>

    ${oc.observacoes ? `<h2>Observações</h2><p>${esc(oc.observacoes)}</p>` : ''}

    <div class="footer">
      <span>Controle OMP — Sistema de Gestão de Frota</span>
      <span>Impresso em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

type CaminhaoParaFicha = {
  codigo: string; placa: string; chassi?: string | null; modelo: string; fabricante: string;
  anoFabricacao: number; kmAtual: number; status: string;
  vencimentoCrlv?: string | null; vencimentoSeguro?: string | null; numeroSeguro?: string | null;
  proximaManutencao?: string | null; proximaManutencaoKm?: number | null;
  motorista?: { nome: string; cnhCategoria?: string | null; cnhValidade?: string | null; telefone?: string } | null;
  custos?: { totalOS: number; custoTotalOS: number; totalAbastecimentos: number; litrosTotais?: number; custoTotalCombustivel: number; custoTotal?: number } | null;
  mediaKmL?: number | null;
  ordensServico?: { codigo: string; tipo: string; status: string; dataConclusao?: string | null; custoTotal?: number | null }[];
};

export function buildCaminhaoHtml(c: CaminhaoParaFicha): string {
  const statusLabel: Record<string, string> = {
    operacional: 'Operacional', manutencao: 'Manutenção', parado: 'Parado',
  };

  const osRows = (c.ordensServico ?? []).slice(0, 10).map((os) =>
    `<tr>
      <td>${esc(os.codigo)}</td>
      <td style="text-transform:capitalize">${esc(os.tipo)}</td>
      <td style="text-transform:capitalize">${esc(os.status)}</td>
      <td>${os.dataConclusao ? fmt(os.dataConclusao) : '—'}</td>
      <td>R$ ${os.custoTotal ? os.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
    </tr>`
  ).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>${esc(c.codigo)} — ${esc(c.fabricante)} ${esc(c.modelo)}</h1>
        <p>Placa: <strong>${esc(c.placa)}</strong> &nbsp;·&nbsp; Chassi: <strong>${esc(c.chassi)}</strong></p>
        <p>Ano: <strong>${c.anoFabricacao}</strong> &nbsp;·&nbsp; KM atual: <strong>${c.kmAtual.toLocaleString('pt-BR')} km</strong></p>
      </div>
      <span class="badge" style="background:#dbeafe;color:#1e40af">${statusLabel[c.status] ?? c.status}</span>
    </div>

    <h2>Documentação e Manutenção</h2>
    <div class="grid-2">
      ${field('Venc. CRLV', fmt(c.vencimentoCrlv))}
      ${field('Venc. Seguro', fmt(c.vencimentoSeguro))}
      ${field('Nº Apólice', c.numeroSeguro ?? '—')}
      ${field('Próx. Manutenção (data)', fmt(c.proximaManutencao))}
      ${field('Próx. Manutenção (km)', c.proximaManutencaoKm ? c.proximaManutencaoKm.toLocaleString('pt-BR') + ' km' : '—')}
    </div>

    ${c.motorista ? `
    <h2>Motorista Responsável</h2>
    <div class="grid-2">
      ${field('Nome', c.motorista.nome)}
      ${field('Categoria CNH', c.motorista.cnhCategoria ?? '—')}
      ${field('Validade CNH', fmt(c.motorista.cnhValidade))}
      ${field('Telefone', c.motorista.telefone ?? '—')}
    </div>` : ''}

    ${c.custos ? `
    <h2>Custos Acumulados</h2>
    <div class="grid-2">
      ${field('OS Concluídas', String(c.custos.totalOS))}
      ${field('Custo Manutenção', 'R$ ' + c.custos.custoTotalOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
      ${field('Abastecimentos', String(c.custos.totalAbastecimentos))}
      ${field('Litros Consumidos', (c.custos.litrosTotais ?? 0).toLocaleString('pt-BR') + ' L')}
      ${field('Eficiência Média', c.mediaKmL != null ? `${c.mediaKmL.toFixed(2)} km/L` : '—')}
      ${field('Custo Combustível', 'R$ ' + c.custos.custoTotalCombustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
      ${field('Custo Total Lifetime', 'R$ ' + (c.custos.custoTotal ?? c.custos.custoTotalOS + c.custos.custoTotalCombustivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
    </div>` : ''}

    ${osRows ? `
    <h2>Histórico de OS (últimas 10)</h2>
    <table>
      <thead>
        <tr><th>Código</th><th>Tipo</th><th>Status</th><th>Conclusão</th><th>Custo</th></tr>
      </thead>
      <tbody>${osRows}</tbody>
    </table>` : ''}

    <div class="footer">
      <span>Controle OMP — Ficha Técnica do Veículo</span>
      <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

export function buildChecklistHtml(
  cl: {
    tipo: string; aprovado: boolean; kmAtual: number; createdAt: string;
    observacoes?: string | null;
    motorista: { nome: string } | null;
    itens: { item: string; ok: boolean; observacoes?: string | null }[];
  },
  caminhao: { codigo: string; placa: string; modelo: string },
): string {
  const tipoLabel: Record<string, string> = { pre_viagem: 'Pré-viagem', pos_viagem: 'Pós-viagem' };
  const reprovados = cl.itens.filter((i) => !i.ok);
  const data = new Date(cl.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const itensRows = cl.itens.map((i) => `
    <tr>
      <td>${esc(i.item)}</td>
      <td style="text-align:center">
        <span style="font-weight:700;color:${i.ok ? '#059669' : '#dc2626'}">${i.ok ? '✓ OK' : '✗ NOK'}</span>
      </td>
      <td style="color:#6b7280;font-size:12px">${i.ok ? '' : esc(i.observacoes)}</td>
    </tr>`).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>Checklist de Vistoria — ${esc(tipoLabel[cl.tipo] ?? cl.tipo)}</h1>
        <p>${esc(caminhao.codigo)} · ${esc(caminhao.placa)} · ${esc(caminhao.modelo)}</p>
      </div>
      <div>
        <span class="badge" style="background:${cl.aprovado ? '#d1fae5' : '#fee2e2'};color:${cl.aprovado ? '#065f46' : '#991b1b'}">
          ${cl.aprovado ? '✓ APROVADO' : '✗ REPROVADO'}
        </span>
      </div>
    </div>

    <div class="grid-2">
      ${field('Motorista', esc(cl.motorista?.nome))}
      ${field('KM no momento', cl.kmAtual.toLocaleString('pt-BR') + ' km')}
      ${field('Data / hora', esc(data))}
      ${field('Tipo', esc(tipoLabel[cl.tipo] ?? cl.tipo))}
    </div>

    <h2>Itens verificados (${cl.itens.length} total · ${reprovados.length} com problema)</h2>
    <table>
      <thead><tr><th>Item</th><th style="width:80px;text-align:center">Status</th><th>Observação</th></tr></thead>
      <tbody>${itensRows}</tbody>
    </table>

    ${cl.observacoes ? `
    <h2>Observações gerais</h2>
    <div class="field"><span>${esc(cl.observacoes)}</span></div>` : ''}

    <div class="footer">
      <span>Controle OMP — Checklist de Vistoria</span>
      <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

export function buildFuncionarioHtml(f: {
  nome: string; cpf: string; cargo: string;
  telefone: string; email?: string; ativo: boolean;
  cnhCategoria?: string; cnhValidade?: string; dataAdmissao?: string;
  caminhoesMotorista: { codigo: string; placa: string; modelo: string; status: string }[];
  ordensResponsavel: { codigo: string; tipo: string; status: string; dataAbertura: string; caminhao: { codigo: string } | null }[];
}): string {
  const cargoLabel: Record<string, string> = {
    motorista: 'Motorista', mecanico: 'Mecânico', almoxarife: 'Almoxarife',
    gerente: 'Gerente', administrativo: 'Administrativo',
  };

  const cnhDias = f.cnhValidade
    ? Math.ceil((new Date(f.cnhValidade).getTime() - Date.now()) / 86400000)
    : null;
  const cnhStatus = cnhDias === null ? '—' : cnhDias < 0 ? `⚠ Vencida há ${-cnhDias} dia(s)` : `✓ Válida (${cnhDias} dias restantes)`;
  const cnhCor = cnhDias !== null && cnhDias < 0 ? '#dc2626' : cnhDias !== null && cnhDias <= 30 ? '#d97706' : '#059669';

  const caminhaoRows = f.caminhoesMotorista.map((c) =>
    `<tr><td>${esc(c.codigo)}</td><td>${esc(c.placa)}</td><td>${esc(c.modelo)}</td><td>${esc(c.status)}</td></tr>`,
  ).join('');

  const osRows = f.ordensResponsavel.slice(0, 10).map((os) =>
    `<tr><td>${esc(os.codigo)}</td><td>${esc(os.caminhao?.codigo)}</td><td>${esc(os.tipo)}</td><td>${esc(os.status)}</td><td>${fmt(os.dataAbertura)}</td></tr>`,
  ).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>${esc(f.nome)}</h1>
        <p>${esc(cargoLabel[f.cargo] ?? f.cargo)} · ${f.ativo ? 'Ativo' : 'Inativo'}</p>
      </div>
      <span class="badge" style="background:${f.ativo ? '#d1fae5' : '#f3f4f6'};color:${f.ativo ? '#065f46' : '#6b7280'}">
        ${f.ativo ? '● Ativo' : '○ Inativo'}
      </span>
    </div>

    <div class="grid-2">
      ${field('CPF', esc(f.cpf))}
      ${field('Telefone', esc(f.telefone))}
      ${field('E-mail', esc(f.email))}
      ${field('Admissão', fmt(f.dataAdmissao))}
    </div>

    ${f.cargo === 'motorista' ? `
    <h2>Habilitação (CNH)</h2>
    <div class="grid-2">
      ${field('Categoria', esc(f.cnhCategoria))}
      ${field('Validade', fmt(f.cnhValidade))}
      <div class="field" style="grid-column:span 2"><label>Situação</label><span style="color:${cnhCor};font-weight:600">${cnhStatus}</span></div>
    </div>` : ''}

    ${f.caminhoesMotorista.length > 0 ? `
    <h2>Caminhão(ões) atribuído(s)</h2>
    <table>
      <thead><tr><th>Código</th><th>Placa</th><th>Modelo</th><th>Status</th></tr></thead>
      <tbody>${caminhaoRows}</tbody>
    </table>` : ''}

    ${f.ordensResponsavel.length > 0 ? `
    <h2>Ordens de Serviço recentes</h2>
    <table>
      <thead><tr><th>Código</th><th>Caminhão</th><th>Tipo</th><th>Status</th><th>Abertura</th></tr></thead>
      <tbody>${osRows}</tbody>
    </table>` : ''}

    <div class="footer">
      <span>Controle OMP — Ficha do Funcionário</span>
      <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}
