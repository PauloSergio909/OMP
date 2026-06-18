import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useFrotaKPIs, useOrdensServicoKPIs } from '../../hooks/useApi';

interface MaintBarProps {
  label: string;
  value: number;
  valueClass: string;
  barClass: string;
}

function MaintBar({ label, value, valueClass, barClass }: MaintBarProps) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-2xl font-bold ${valueClass}`}>{value}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function GraficoFrotaManutencao() {
  const { data: frotaKPIs, isLoading: loadingFrota } = useFrotaKPIs();
  const { data: osKPIs, isLoading: loadingOS } = useOrdensServicoKPIs();

  const taxaPreventiva = osKPIs?.taxaPreventiva ?? 0;
  const taxaCorretiva  = osKPIs ? +(100 - taxaPreventiva).toFixed(1) : 0;

  const frotaPie = useMemo(() => frotaKPIs
    ? [
        { name: 'Operacional', value: frotaKPIs.operacionais, color: '#22c55e' },
        { name: 'Manutenção',  value: frotaKPIs.emManutencao, color: '#f59e0b' },
        { name: 'Parado',      value: frotaKPIs.parados,      color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [], [frotaKPIs]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Distribuição da Frota</h3>
          <p className="text-xs text-gray-400 mb-2">Status atual dos {frotaKPIs?.total ?? '—'} veículos</p>
          {loadingFrota || frotaPie.length === 0 ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={frotaPie} cx="50%" cy="46%" innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value">
                  {frotaPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: number, n: string) => [v + ' veículo(s)', n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Manutenções — Este mês</h3>
          <p className="text-xs text-gray-400 mb-4">
            Meta: &gt; 70% preventiva
            {taxaPreventiva > 0 && (
              <span className={`ml-1.5 font-medium ${taxaPreventiva >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                {taxaPreventiva >= 70 ? '✓ Meta atingida' : '⚠ Abaixo da meta'}
              </span>
            )}
          </p>
          {loadingOS ? (
            <div className="flex-1 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-col justify-center gap-5 flex-1">
              <MaintBar label="Preventiva" value={taxaPreventiva} valueClass="text-green-600" barClass="bg-green-500" />
              <MaintBar label="Corretiva"  value={taxaCorretiva}  valueClass="text-red-500"   barClass="bg-red-400" />
              <div className="text-center mt-1">
                {taxaPreventiva >= 70 ? (
                  <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-100 px-3 py-1 rounded-full">Parabéns! Meta de qualidade atingida</span>
                ) : taxaPreventiva > 0 ? (
                  <span className="text-xs text-orange-600 font-medium bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Aumentar manutenções preventivas</span>
                ) : (
                  <span className="text-xs text-gray-400">Sem OS registradas no mês</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
