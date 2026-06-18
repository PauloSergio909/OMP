import { relativeDate } from '../../utils/formatDate';

interface RelDateProps {
  date: string | Date;
  className?: string;
}

export function RelDate({ date, className }: RelDateProps) {
  const r = relativeDate(date);
  return <span title={r.title} className={className}>{r.label}</span>;
}
