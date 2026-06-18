interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  operacional:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Operacional' },
  manutencao:      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Em Manutenção' },
  parado:          { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Parado' },

  orcamento:       { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Orçamento' },
  agendada:        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Agendada' },
  em_andamento:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Em Andamento' },
  aguardando_peca: { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Aguardando Peça' },
  concluida:       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Concluída' },
  cancelada:       { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Cancelada' },

  baixa:           { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Baixa' },
  media:           { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-400',    label: 'Média' },
  alta:            { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-500',  label: 'Alta' },
  critica:         { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-600',     label: 'Crítica' },

  preventiva:      { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Preventiva' },
  corretiva:       { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'Corretiva' },

  motorista:       { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Motorista' },
  mecanico:        { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'Mecânico' },
  almoxarife:      { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500',    label: 'Almoxarife' },
  gerente:         { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'Gerente' },
  administrativo:  { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Administrativo' },
  admin:           { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Admin' },
  visualizador:    { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-300',    label: 'Visualizador' },

  ativo:           { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Ativo' },
  inativo:         { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400',     label: 'Inativo' },

  disponivel:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Disponível' },
  em_uso:          { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Em Uso' },
  descartado:      { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Descartado' },

  equipamento:     { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Equipamento' },
  ferramenta:      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Ferramenta' },
  veiculo_apoio:   { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Veíc. Apoio' },

  diesel:          { bg: 'bg-zinc-50',    text: 'text-zinc-700',    dot: 'bg-zinc-500',    label: 'Diesel' },
  diesel_s10:      { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    label: 'Diesel S10' },
  arla32:          { bg: 'bg-lime-50',    text: 'text-lime-700',    dot: 'bg-lime-500',    label: 'Arla 32' },

  pendente:        { bg: 'bg-yellow-50',  text: 'text-yellow-700',  dot: 'bg-yellow-500',  label: 'Pendente' },
  aprovada:        { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Aprovada' },
  recebida:        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Recebida' },
};

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
