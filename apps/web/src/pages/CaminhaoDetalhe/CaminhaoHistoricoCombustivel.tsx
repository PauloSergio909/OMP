import { Fuel } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useHistoricoAbastecimento } from '../../hooks/useApi';

interface Props {
  id: string;
}

export function CaminhaoHistoricoCombustivel({ id }: Props) {
  const { data: historicoAbast = [] } = useHistoricoAbastecimento(6, id);

  if (historicoAbast.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Fuel size={16} className="text-green-500" />
        <h3 className="text-sm font-semibold text-gray-900">Consumo de Combustível — Últimos 6 meses</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={historicoAbast} margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="litros" orientation="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}L`} width={40} />
          <YAxis yAxisId="custo" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value: number, name: string) =>
              name === 'litros'
                ? [`${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`, 'Litros']
                : [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']
            }
          />
          <Legend formatter={(v) => v === 'litros' ? 'Litros' : 'Custo (R$)'} wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="litros" dataKey="litros" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar yAxisId="custo" dataKey="custo" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
