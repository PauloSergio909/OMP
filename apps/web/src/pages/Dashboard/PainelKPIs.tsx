import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, ClipboardList, DollarSign, AlertTriangle, Fuel, ArrowRight, RefreshCw } from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import {
  useEstoqueKPIs, useFrotaKPIs, useOrdensServicoKPIs,
  useAbastecimentosKPIs, usePneusKPIs, useOSPorStatus,
} from '../../hooks/useApi';

export function PainelKPIs() {
  const navigate = useNavigate();

  const { data: estoqueKPIs, isLoading: loadingEstoque, isFetching: fetchingEstoque } = useEstoqueKPIs();
  const { data: frotaKPIs,   isLoading: loadingFrota,   isFetching: fetchingFrota }   = useFrotaKPIs();
  const { data: osKPIs,      isLoading: loadingOS,       isFetching: fetchingOS, dataUpdatedAt } = useOrdensServicoKPIs();
  const { data: combKPIs }  = useAbastecimentosKPIs();
  const { data: pneusKPIs } = usePneusKPIs();
  const { data: osPorStatus = [] } = useOSPorStatus();

  const isRefreshing = (fetchingEstoque || fetchingFrota || fetchingOS) && !loadingEstoque && !loadingFrota && !loadingOS;

  const [refreshLabel, setRefreshLabel] = useState('');
  useEffect(() => {
    function tick() {
      if (!dataUpdatedAt) return;
      const secs = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      setRefreshLabel(secs < 10 ? 'agora' : secs < 60 ? `${secs}s atrás` : `${Math.floor(secs / 60)} min atrás`);
    }
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const osAbertas   = osKPIs?.abertas   ?? '—';
  const osUrgentes  = osKPIs?.urgentes  ?? 0;
  const osAtrasadas = osKPIs?.atrasadas ?? 0;
  const custoMes    = osKPIs?.custoMes  ?? 0;

  const deltaOS = useMemo<{ value: number; label: string } | undefined>(() => {
    if (!osKPIs || osKPIs.concluidasMesAnterior == null) return undefined;
    const prev = osKPIs.concluidasMesAnterior;
    if (prev === 0) return undefined;
    const delta = +(((osKPIs.concluidasMes - prev) / prev) * 100).toFixed(1);
    return { value: delta, label: 'vs mês anterior' };
  }, [osKPIs]);

  const deltaCusto = useMemo<{ value: number; label: string } | undefined>(() => {
    if (!osKPIs || osKPIs.custoMesAnterior == null) return undefined;
    const prev = osKPIs.custoMesAnterior;
    if (prev === 0) return undefined;
    const delta = +(((custoMes - prev) / prev) * 100).toFixed(1);
    return { value: -delta, label: 'vs mês anterior' };
  }, [osKPIs, custoMes]);

  const statusCfg: Record<string, { label: string; cor: string; bg: string }> = {
    orcamento:       { label: 'Orçamento',   cor: 'bg-gray-400',   bg: 'bg-gray-50' },
    agendada:        { label: 'Agendada',     cor: 'bg-blue-500',   bg: 'bg-blue-50' },
    em_andamento:    { label: 'Em Andamento', cor: 'bg-amber-500',  bg: 'bg-amber-50' },
    aguardando_peca: { label: 'Aguard. Peça', cor: 'bg-purple-500', bg: 'bg-purple-50' },
    concluida:       { label: 'Concluída',    cor: 'bg-green-500',  bg: 'bg-green-50' },
    cancelada:       { label: 'Cancelada',    cor: 'bg-red-400',    bg: 'bg-red-50' },
  };
  const totalOS = osPorStatus.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      {refreshLabel && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-blue-400' : 'opacity-60'} />
          <span>{isRefreshing ? 'Atualizando…' : `Atualizado ${refreshLabel}`}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button onClick={() => navigate(estoqueKPIs?.itensAbaixoMinimo ? '/estoque?critico=1' : '/estoque')} className="text-left">
          <KPICard title="Materiais em Estoque" value={loadingEstoque ? '...' : estoqueKPIs?.totalMateriais ?? '—'} subtitle={`${estoqueKPIs?.itensAbaixoMinimo ?? 0} abaixo do mínimo`} icon={Package} color={estoqueKPIs?.itensAbaixoMinimo ? 'red' : 'blue'} />
        </button>
        <button onClick={() => navigate(frotaKPIs?.parados ? '/frota?status=parado' : frotaKPIs?.emManutencao ? '/frota?status=manutencao' : '/frota')} className="text-left">
          <KPICard title="Frota Operacional" value={loadingFrota ? '...' : frotaKPIs ? `${frotaKPIs.operacionais}/${frotaKPIs.total}` : '—'} subtitle={frotaKPIs ? `${frotaKPIs.taxaDisponibilidade}% de disponibilidade` : ''} icon={Truck} color={frotaKPIs?.parados ? 'red' : frotaKPIs?.emManutencao ? 'orange' : 'green'} />
        </button>
        <button onClick={() => navigate(osAtrasadas > 0 ? '/ordens-servico?view=lista&atrasada=1' : osUrgentes > 0 ? '/ordens-servico?view=lista&prioridade=critica' : '/ordens-servico')} className="text-left" title={osAtrasadas > 0 ? 'Ver OS com prazo vencido' : osUrgentes > 0 ? 'Ver OS com prioridade crítica' : 'Ver todas as OS'}>
          <KPICard title="OS Abertas" value={loadingOS ? '...' : osAbertas} subtitle={osAtrasadas > 0 ? `${osAtrasadas} atrasada${osAtrasadas !== 1 ? 's' : ''}` : `${osUrgentes} urgente${osUrgentes !== 1 ? 's' : ''}`} icon={ClipboardList} color={osAtrasadas > 0 || osUrgentes > 0 ? 'red' : 'orange'} trend={deltaOS} />
        </button>
        <button onClick={() => navigate('/relatorios')} className="text-left">
          <KPICard title="Custo Mensal (OS)" value={loadingOS ? '...' : `R$ ${(custoMes / 1000).toFixed(1)}k`} subtitle="OS concluídas no mês" icon={DollarSign} color="purple" trend={deltaCusto} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/frota')} className="text-left">
          <KPICard title="Pneus em Alerta" value={pneusKPIs?.alertas80 ?? '—'} subtitle={pneusKPIs ? `${pneusKPIs.alertas95} crítico${pneusKPIs.alertas95 !== 1 ? 's' : ''} (≥95%) · ${pneusKPIs.ativos} ativos` : ''} icon={AlertTriangle} color={pneusKPIs?.alertas95 ? 'red' : pneusKPIs?.alertas80 ? 'orange' : 'green'} />
        </button>
        <button onClick={() => navigate('/relatorios?tab=Combustível')} className="text-left">
          <KPICard title="Combustível (mês)" value={combKPIs ? `${(combKPIs.litrosMes ?? 0).toFixed(0)} L` : '—'} subtitle={combKPIs ? `R$ ${(combKPIs.custoMes ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · R$ ${(combKPIs.precoMedioLitro ?? 0).toFixed(2)}/L` : ''} icon={Fuel} color="blue" />
        </button>
      </div>

      {osPorStatus.length > 0 && totalOS > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">OS por Status</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totalOS} ordens de serviço no total</p>
            </div>
            <button onClick={() => navigate('/ordens-servico?view=lista')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </button>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
            {osPorStatus.filter((r) => r.total > 0).map((r) => (
              <div key={r.status} className={`${statusCfg[r.status]?.cor ?? 'bg-gray-300'} transition-all`} style={{ width: `${(r.total / totalOS) * 100}%` }} title={`${statusCfg[r.status]?.label ?? r.status}: ${r.total}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {osPorStatus.map((r) => {
              const cfg = statusCfg[r.status];
              return (
                <button key={r.status} onClick={() => navigate(`/ordens-servico?view=lista&status=${r.status}`)} className={`${cfg?.bg ?? 'bg-gray-50'} rounded-xl p-2.5 text-center hover:opacity-80 transition`}>
                  <p className="text-lg font-bold text-gray-900">{r.total}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">{cfg?.label ?? r.status}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
