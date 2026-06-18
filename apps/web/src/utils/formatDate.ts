const fmt = (d: Date) => d.toLocaleDateString('pt-BR');

export function relativeDate(value: string | Date): { label: string; title: string } {
  const d = new Date(value);
  const title = fmt(d);
  const now = new Date();

  // Normalize to midnight for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0)  return { label: 'hoje',    title };
  if (diffDays === 1)  return { label: 'ontem',   title };
  if (diffDays === -1) return { label: 'amanhã',  title };
  if (diffDays > 1 && diffDays < 7)   return { label: `há ${diffDays} dias`,    title };
  if (diffDays < -1 && diffDays > -7) return { label: `em ${-diffDays} dias`,   title };
  if (diffDays >= 7 && diffDays < 14) return { label: 'há 1 semana',            title };
  if (diffDays <= -7 && diffDays > -14) return { label: 'em 1 semana',          title };

  return { label: title, title };
}
