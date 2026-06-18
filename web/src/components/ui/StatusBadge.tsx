// ══════════════════════════════════════════════════════════════
// STATUS BADGE — Etiqueta colorida para status
// ══════════════════════════════════════════════════════════════
// Mostra status com cores padronizadas em todo o sistema.
// Ex: "Operacional" (verde), "Em Manutenção" (amarelo), "Parado" (vermelho)

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

// Mapa de cores por status (cobre todos os status do sistema)
const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  // Caminhões
  operacional:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Operacional' },
  manutencao:      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Em Manutenção' },
  parado:          { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Parado' },

  // Ordens de Serviço
  agendada:        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Agendada' },
  em_andamento:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Em Andamento' },
  aguardando_peca: { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Aguardando Peça' },
  concluida:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Concluída' },
  cancelada:       { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Cancelada' },

  // Prioridades
  baixa:           { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Baixa' },
  media:           { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-400',    label: 'Média' },
  alta:            { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-500',  label: 'Alta' },
  critica:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-600',     label: 'Crítica' },

  // Tipos de OS
  preventiva:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Preventiva' },
  corretiva:       { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Corretiva' },
};

// Fallback para status desconhecidos
const defaultConfig = { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: '—' };

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || defaultConfig;

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium
      ${config.bg} ${config.text}
      ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
