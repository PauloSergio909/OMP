import { useNavigate } from 'react-router-dom';
import { Fuel } from 'lucide-react';
import { useAbastecimentosKPIs } from '../../hooks/useApi';

interface FuelCardProps {
  label: string;
  value: string;
  subtitle: string;
  onClick: () => void;
}

function FuelCard({ label, value, subtitle, onClick }: FuelCardProps) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 transition group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
        <Fuel size={14} className="text-gray-300 group-hover:text-blue-400 transition" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </button>
  );
}

export function ResumoCombustivel() {
  const navigate = useNavigate();
  const { data: combKPIs } = useAbastecimentosKPIs();

  if (!combKPIs) return null;

  const toNav = () => navigate('/abastecimento');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <FuelCard label="Abastecimentos (mês)" value={String(combKPIs.abastecimentosMes)} subtitle="registros" onClick={toNav} />
      <FuelCard label="Litros (mês)" value={`${combKPIs.litrosMes.toFixed(0)} L`} subtitle="consumo total" onClick={toNav} />
      <FuelCard label="Preço médio" value={`R$ ${combKPIs.precoMedioLitro.toFixed(3)}/L`} subtitle="diesel no mês" onClick={toNav} />
    </div>
  );
}
