export const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function printDocument(html: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1f2937; padding: 32px; }
    h1 { font-size: 20px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; color: #1e40af; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: .04em; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1e40af; }
    .header-left p { color: #6b7280; font-size: 12px; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .field { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
    .field label { display: block; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
    .field span { font-size: 13px; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .total-row td { font-weight: 700; background: #f0f7ff; border-top: 2px solid #bfdbfe; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 16px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
${html}
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
  win.document.close();
}

export function field(label: string, value: string) {
  return `<div class="field"><label>${label}</label><span>${value}</span></div>`;
}

export function buildRelatorioTabHtml(
  titulo: string,
  kpis: { label: string; value: string | number | null; sub?: string }[],
  secoes: { titulo: string; headers: string[]; rows: (string | number | null)[][] }[],
): string {
  const kpiHtml = kpis.length > 0
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px">
        ${kpis.map((k) => `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
            <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${esc(k.label)}</div>
            <div style="font-size:20px;font-weight:700;color:#111827">${esc(String(k.value ?? '—'))}</div>
            ${k.sub ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${esc(k.sub)}</div>` : ''}
          </div>`).join('')}
      </div>`
    : '';

  const secoesHtml = secoes.map((s) => `
    <h2>${esc(s.titulo)}</h2>
    <table>
      <thead><tr>${s.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${s.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(String(cell ?? '—'))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`).join('');

  return `
    <div class="header">
      <div class="header-left">
        <h1>Relatório — ${esc(titulo)}</h1>
        <p>FleetMaster · Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
    ${kpiHtml}
    ${secoesHtml}
    <div class="footer">
      <span>FleetMaster — Sistema de Gestão de Frota</span>
      <span>Impresso em ${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

