// ══════════════════════════════════════════════════════════════
// KPI CARD — Componente reutilizável para indicadores
// ══════════════════════════════════════════════════════════════
// Exibe um número grande + label + variação (seta pra cima/baixo)
// Usado no Dashboard, Estoque, Frota, etc.

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;            // "Total de Materiais"
  value: string | number;   // "847" ou 847
  subtitle?: string;        // "unidades em estoque"
  icon: LucideIcon;         // Ícone do lucide-react
  color: 'blue' | 'orange' | 'green' | 'red' | 'purple';
  trend?: {
    value: number;          // +12.5 ou -3.2
    label: string;          // "vs mês anterior"
  };
}

// Mapa de cores para cada variante
const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   iconBg: 'bg-blue-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', iconBg: 'bg-orange-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  iconBg: 'bg-green-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    iconBg: 'bg-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', iconBg: 'bg-purple-100' },
};

export function KPICard({ title, value, subtitle, icon: Icon, color, trend }: KPICardProps) {
  const colors = colorMap[color];
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {/* Ícone */}
        <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
          <Icon size={20} className={colors.icon} />
        </div>

        {/* Trend (variação) */}
        {trend && (
          <div className={`
            flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg
            ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
          `}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>

      {/* Título e subtítulo */}
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}

      {/* Label do trend */}
      {trend && (
        <div className="text-xs text-gray-400 mt-2">{trend.label}</div>
      )}
    </div>
  );
}
