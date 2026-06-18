import { useState } from 'react';
import { Truck } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useHistoricoAbastecimento } from '../../hooks/useApi';

const PERIODOS = [
  { label: '3M', meses: 3 },
  { label: '6M', meses: 6 },
  { label: '12M', meses: 12 },
];

export function GraficoCombustivel() {
  const [periodoMeses, setPeriodoMeses] = useState(6);
  const { data: historicoAbast = [] } = useHistoricoAbastecimento(periodoMeses);

  const deltaCombustivel = (() => {
    if (historicoAbast.length < 2) return undefined;
    const prev = historicoAbast[historicoAbast.length - 2].litros;
    const curr = historicoAbast[historicoAbast.length - 1].litros;
    if (prev === 0) return undefined;
    const delta = +(((curr - prev) / prev) * 100).toFixed(1);
    return { value: -delta };
  })();

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Consumo de Combustível</h3>
          <p className="text-xs text-gray-400 mt-0.5">Litros e custo — últimos {periodoMeses} meses</p>
        </div>
        <div className="flex items-center gap-2">
          {deltaCombustivel && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deltaCombustivel.value >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {deltaCombustivel.value >= 0 ? '▼' : '▲'} {Math.abs(deltaCombustivel.value)}%
            </span>
          )}
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.meses}
                onClick={() => setPeriodoMeses(p.meses)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${periodoMeses === p.meses ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {historicoAbast.length === 0 ? (
        <div className="h-[260px] flex flex-col items-center justify-center text-gray-300">
          <Truck size={32} className="mb-2 opacity-50" />
          <p className="text-xs">Sem registros de abastecimento no período</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={historicoAbast}>
            <defs>
              <linearGradient id="gradLitros" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#118AB2" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#118AB2" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCusto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F77F00" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F77F00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              formatter={(value: number, name: string) => [
                name === 'Litros (L)' ? `${value.toLocaleString('pt-BR')} L` : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                name,
              ]}
            />
            <Area yAxisId="left" type="monotone" dataKey="litros" stroke="#118AB2" fill="url(#gradLitros)" strokeWidth={2} name="Litros (L)" />
            <Area yAxisId="right" type="monotone" dataKey="custo" stroke="#F77F00" fill="url(#gradCusto)" strokeWidth={2} name="Custo (R$)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
