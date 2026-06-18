import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, TrendingUp, Truck, Package, Fuel, ClipboardList, Wrench, Car, ShoppingCart, Users,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  useEstoqueKPIs, useFrotaKPIs, useAbastecimentosKPIs, useOrdensServicoKPIs,
  useCustoPorCaminhao, useFuncionariosKPIs, useCnhVencendo, useComprasKPIs,
  usePneusKPIs, useEquipamentosKPIs,
} from '../../../hooks/useApi';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

interface ResumoCardProps {
  onClick: () => void;
  title?: string;
  iconBg: string;
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: ReactNode;
  subtitle: string;
  subtitleClass?: string;
}

function ResumoCard({ onClick, title, iconBg, icon: Icon, iconClass, label, value, subtitle, subtitleClass = 'text-gray-400' }: ResumoCardProps) {
  return (
    <button onClick={onClick} className="text-left bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 transition" title={title}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconClass} />
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs mt-1 ${subtitleClass}`}>{subtitle}</p>
    </button>
  );
}

interface Props {
  onSetTab: (tab: string) => void;
}

export function TabResumoGeral({ onSetTab }: Props) {
  const navigate = useNavigate();
  const { data: estoqueKPIs } = useEstoqueKPIs();
  const { data: frotaKPIs } = useFrotaKPIs();
  const { data: combKPIs } = useAbastecimentosKPIs();
  const { data: osKPIs } = useOrdensServicoKPIs();
  const { data: custoOS = [] } = useCustoPorCaminhao();
  const { data: funcKPIs } = useFuncionariosKPIs();
  const { data: cnhVencendo = [] } = useCnhVencendo();
  const { data: comprasKPIs } = useComprasKPIs();
  const { data: pneusKPIs } = usePneusKPIs();
  const { data: equipKPIs } = useEquipamentosKPIs();

  const taxaPreventiva = osKPIs?.taxaPreventiva ?? 0;
  const taxaCorretiva = osKPIs ? +(100 - taxaPreventiva).toFixed(1) : 0;
  const tiposOS = useMemo(() => [
    { name: 'Preventiva', value: taxaPreventiva, color: '#06D6A0' },
    { name: 'Corretiva', value: taxaCorretiva, color: '#EF476F' },
  ], [taxaPreventiva, taxaCorretiva]);

  function exportarPDF() {
    const kpis = [
      { label: 'Frota', value: frotaKPIs?.total ?? '—', sub: `${frotaKPIs?.taxaDisponibilidade ?? '—'}% disponível` },
      { label: 'Estoque', value: estoqueKPIs?.totalMateriais ?? '—', sub: `${estoqueKPIs?.itensAbaixoMinimo ?? 0} abaixo do mínimo` },
      { label: 'OS Abertas', value: osKPIs?.abertas ?? '—', sub: `${osKPIs?.atrasadas ?? 0} atrasadas` },
      { label: 'Combustível (mês)', value: combKPIs?.litrosMes ? `${combKPIs.litrosMes.toFixed(0)} L` : '—' },
      { label: 'Custo OS (mês)', value: osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—' },
      { label: 'Valor em Estoque', value: estoqueKPIs?.valorEstoque ? `R$ ${(estoqueKPIs.valorEstoque / 1000).toFixed(1)}k` : '—' },
      { label: 'Pneus em Alerta', value: pneusKPIs?.alertas80 ?? '—', sub: `${pneusKPIs?.alertas95 ?? 0} crítico(s)` },
      { label: 'Equipamentos', value: equipKPIs?.total ?? '—', sub: `${equipKPIs?.revisaoVencendo ?? 0} revisão vencendo` },
    ];
    printDocument(buildRelatorioTabHtml('Resumo Geral', kpis, []), 'Relatório — Resumo Geral');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          onClick={exportarPDF}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <FileText size={15} /> Exportar PDF
        </button>
      </div>

      {/* KPI Summary — Frota / Estoque / Combustível / Valor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard
          onClick={() => navigate((frotaKPIs?.manutencaoVencendo ?? 0) > 0 ? '/frota?manutencao=1' : '/frota')}
          title={(frotaKPIs?.manutencaoVencendo ?? 0) > 0 ? 'Ver veículos com manutenção vencendo' : 'Ver frota'}
          iconBg="bg-blue-50" icon={Truck} iconClass="text-blue-600"
          label="Frota"
          value={frotaKPIs?.total ?? '—'}
          subtitle={(frotaKPIs?.manutencaoVencendo ?? 0) > 0 ? `${frotaKPIs?.manutencaoVencendo} manutenção vencendo` : `${frotaKPIs?.taxaDisponibilidade ?? '—'}% disponível`}
          subtitleClass={(frotaKPIs?.manutencaoVencendo ?? 0) > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}
        />
        <ResumoCard
          onClick={() => navigate(estoqueKPIs?.itensAbaixoMinimo ? '/estoque?critico=1' : '/estoque')}
          iconBg="bg-green-50" icon={Package} iconClass="text-green-600"
          label="Estoque"
          value={estoqueKPIs?.totalMateriais ?? '—'}
          subtitle={`${estoqueKPIs?.itensAbaixoMinimo ?? 0} abaixo do mínimo`}
          subtitleClass="text-red-500"
        />
        <ResumoCard
          onClick={() => navigate('/abastecimento')}
          iconBg="bg-amber-50" icon={Fuel} iconClass="text-amber-600"
          label="Combustível (mês)"
          value={combKPIs?.litrosMes ? `${combKPIs.litrosMes.toFixed(0)} L` : '—'}
          subtitle={`${combKPIs?.abastecimentosMes ?? 0} abastecimentos`}
        />
        <ResumoCard
          onClick={() => navigate('/estoque')}
          iconBg="bg-purple-50" icon={TrendingUp} iconClass="text-purple-600"
          label="Valor Estoque"
          value={estoqueKPIs?.valorEstoque ? `R$ ${(estoqueKPIs.valorEstoque / 1000).toFixed(1)}k` : '—'}
          subtitle="em materiais"
        />
      </div>

      {/* Segunda linha: OS KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard
          onClick={() => navigate((osKPIs?.atrasadas ?? 0) > 0 ? '/ordens-servico?view=lista&atrasada=1' : '/ordens-servico?view=lista')}
          title={(osKPIs?.atrasadas ?? 0) > 0 ? 'Ver OS atrasadas' : 'Ver OS abertas'}
          iconBg="bg-orange-50" icon={Wrench} iconClass="text-orange-500"
          label="OS Abertas"
          value={osKPIs?.abertas ?? '—'}
          subtitle={(osKPIs?.atrasadas ?? 0) > 0 ? `${osKPIs?.atrasadas} atrasada${osKPIs?.atrasadas !== 1 ? 's' : ''}` : `${osKPIs?.urgentes ?? 0} urgente(s)`}
          subtitleClass={(osKPIs?.atrasadas ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
        />
        <ResumoCard
          onClick={() => navigate('/ordens-servico?view=lista&status=concluida')}
          iconBg="bg-green-50" icon={ClipboardList} iconClass="text-green-600"
          label="Concluídas (mês)"
          value={osKPIs?.concluidasMes ?? '—'}
          subtitle="no mês corrente"
        />
        <ResumoCard
          onClick={() => onSetTab('Manutenção')}
          iconBg="bg-blue-50" icon={ClipboardList} iconClass="text-blue-600"
          label="% Preventiva"
          value={osKPIs ? `${osKPIs.taxaPreventiva}%` : '—'}
          subtitle={taxaPreventiva >= 70 ? '✓ meta atingida' : '⚠ abaixo da meta'}
          subtitleClass={taxaPreventiva >= 70 ? 'text-green-600' : 'text-red-500'}
        />
        <ResumoCard
          onClick={() => onSetTab('Manutenção')}
          iconBg="bg-purple-50" icon={TrendingUp} iconClass="text-purple-600"
          label="Custo OS (mês)"
          value={osKPIs ? `R$ ${(osKPIs.custoMes / 1000).toFixed(1)}k` : '—'}
          subtitle="mat. + mão de obra"
        />
      </div>

      {/* Terceira linha: Pneus + Equipamentos + Compras + Funcionários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard
          onClick={() => onSetTab('Pneus')}
          title="Ver relatório de pneus"
          iconBg={(pneusKPIs?.alertas95 ?? 0) > 0 ? 'bg-red-50' : (pneusKPIs?.alertas80 ?? 0) > 0 ? 'bg-amber-50' : 'bg-green-50'}
          icon={Car}
          iconClass={(pneusKPIs?.alertas95 ?? 0) > 0 ? 'text-red-500' : (pneusKPIs?.alertas80 ?? 0) > 0 ? 'text-amber-500' : 'text-green-500'}
          label="Pneus Alerta"
          value={pneusKPIs?.alertas80 ?? '—'}
          subtitle={(pneusKPIs?.alertas95 ?? 0) > 0 ? `${pneusKPIs?.alertas95} crítico(s) ≥95%` : `${pneusKPIs?.ativos ?? 0} ativos`}
          subtitleClass={(pneusKPIs?.alertas95 ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
        />
        <ResumoCard
          onClick={() => onSetTab('Equipamentos')}
          iconBg="bg-indigo-50" icon={Wrench} iconClass="text-indigo-600"
          label="Equipamentos"
          value={equipKPIs?.total ?? '—'}
          subtitle={(equipKPIs?.revisaoVencendo ?? 0) > 0 ? `${equipKPIs?.revisaoVencendo} revisão vencendo` : `${equipKPIs?.disponiveis ?? 0} disponíveis`}
          subtitleClass={(equipKPIs?.revisaoVencendo ?? 0) > 0 ? 'text-amber-500 font-medium' : 'text-gray-400'}
        />
        <ResumoCard
          onClick={() => onSetTab('Compras')}
          iconBg="bg-amber-50" icon={ShoppingCart} iconClass="text-amber-500"
          label="OC Pendentes"
          value={comprasKPIs?.pendentes ?? '—'}
          subtitle={(comprasKPIs?.atrasadas ?? 0) > 0 ? `${comprasKPIs?.atrasadas} em atraso` : `R$ ${((comprasKPIs?.valorEmAberto ?? 0) / 1000).toFixed(1)}k em aberto`}
          subtitleClass={(comprasKPIs?.atrasadas ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
        />
        <ResumoCard
          onClick={() => onSetTab('Funcionários')}
          iconBg="bg-teal-50" icon={Users} iconClass="text-teal-600"
          label="Funcionários"
          value={funcKPIs?.ativos ?? '—'}
          subtitle={cnhVencendo.length > 0 ? `${cnhVencendo.length} CNH vencendo` : 'ativos'}
          subtitleClass={cnhVencendo.length > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
        />
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Tipo de Manutenção</h3>
          <p className="text-xs text-gray-400 mb-4">Distribuição no período</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={tiposOS} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {tiposOS.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {tiposOS.map((t) => (
                <div key={t.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-gray-600">{t.name}</span>
                  <span className="font-bold text-gray-900 ml-auto">{t.value}%</span>
                </div>
              ))}
              <p className={`text-xs font-medium pt-1 ${taxaPreventiva >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                {taxaPreventiva >= 70 ? '✓ Meta atingida (>70% preventiva)' : '⚠ Abaixo da meta (>70%)'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Custo por Caminhão (OS)</h3>
          <p className="text-xs text-gray-400 mb-3">Preventiva vs Corretiva — mês corrente</p>
          {custoOS.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-xs">
              Nenhuma OS concluída no mês
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={custoOS.slice(0, 5)} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="caminhao" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="preventiva" fill="#06D6A0" radius={[4, 4, 0, 0]} name="Preventiva" />
                <Bar dataKey="corretiva" fill="#EF476F" radius={[4, 4, 0, 0]} name="Corretiva" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
