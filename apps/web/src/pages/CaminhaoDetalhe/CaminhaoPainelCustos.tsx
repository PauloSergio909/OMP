import { useNavigate } from 'react-router-dom';
import { Wrench, Fuel, TrendingUp, type LucideIcon } from 'lucide-react';
import type { CaminhaoCustos } from '../../hooks/useApi';

interface CostCardProps {
  onClick: () => void;
  hoverClass: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  subtitle: string;
}

function CostCard({ onClick, hoverClass, icon: Icon, iconClass, label, value, subtitle }: CostCardProps) {
  return (
    <button onClick={onClick} className={`text-left bg-white rounded-2xl border border-gray-100 p-5 ${hoverClass} transition`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={iconClass} />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </button>
  );
}

interface Props {
  custos: CaminhaoCustos;
  id: string;
}

export function CaminhaoPainelCustos({ custos, id }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <CostCard
        onClick={() => navigate(`/ordens-servico?caminhao=${id}&status=concluida`)}
        hoverClass="hover:border-orange-200"
        icon={Wrench} iconClass="text-orange-500"
        label="OS Concluídas"
        value={custos.totalOS}
        subtitle="ordens encerradas"
      />
      <CostCard
        onClick={() => navigate(`/ordens-servico?caminhao=${id}`)}
        hoverClass="hover:border-red-200"
        icon={Wrench} iconClass="text-red-500"
        label="Custo Manutenção"
        value={`R$ ${(custos.custoTotalOS / 1000).toFixed(1)}k`}
        subtitle="acumulado total"
      />
      <CostCard
        onClick={() => navigate(`/abastecimento?caminhao=${id}`)}
        hoverClass="hover:border-blue-200"
        icon={Fuel} iconClass="text-green-500"
        label="Abastecimentos"
        value={custos.totalAbastecimentos}
        subtitle="registros totais"
      />
      <CostCard
        onClick={() => navigate(`/abastecimento?caminhao=${id}`)}
        hoverClass="hover:border-blue-200"
        icon={Fuel} iconClass="text-blue-500"
        label="Custo Combustível"
        value={`R$ ${(custos.custoTotalCombustivel / 1000).toFixed(1)}k`}
        subtitle={`${(custos.litrosTotais ?? 0).toLocaleString('pt-BR')} L consumidos`}
      />
      <div className="text-left bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-gray-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custo Total Lifetime</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">R$ {(custos.custoTotal / 1000).toFixed(1)}k</p>
        <p className="text-xs text-gray-500 mt-0.5">manutenção + combustível</p>
      </div>
    </div>
  );
}
