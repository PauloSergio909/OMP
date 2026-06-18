import { useUrlState } from '../../hooks/useUrlState';
import { usePageTitle } from '../../hooks/usePageTitle';
import { TabPneus } from './tabs/TabPneus';
import { TabResumoGeral } from './tabs/TabResumoGeral';
import { TabCombustivel } from './tabs/TabCombustivel';
import { TabManutencao } from './tabs/TabManutencao';
import { TabOrdensServico } from './tabs/TabOrdensServico';
import { TabFuncionarios } from './tabs/TabFuncionarios';
import { TabCompras } from './tabs/TabCompras';
import { TabEstoque } from './tabs/TabEstoque';
import { TabFrota } from './tabs/TabFrota';
import { TabEquipamentos } from './tabs/TabEquipamentos';

const tabs = ['Combustível', 'Manutenção', 'Ordens de Serviço', 'Estoque', 'Funcionários', 'Compras', 'Equipamentos', 'Frota', 'Pneus', 'Resumo Geral'];

export function RelatoriosPage() {
  usePageTitle('Relatórios');
  const [tabAtiva, setTabAtiva] = useUrlState('tab', 'Resumo Geral');

  return (
    <div className="space-y-6">
      {/* Cabeçalho visível apenas na impressão */}
      <div className="hidden print:block mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">FleetMaster — Relatório: {tabAtiva}</h1>
        <p className="text-sm text-gray-500">Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-base font-bold text-gray-900">Relatórios e Análises</h1>
          <p className="text-xs text-gray-400 mt-0.5">Visão consolidada do desempenho operacional</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setTabAtiva(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
              tabAtiva === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {tabAtiva === 'Pneus' && <TabPneus />}
      {tabAtiva === 'Resumo Geral' && <TabResumoGeral onSetTab={setTabAtiva} />}
      {tabAtiva === 'Combustível' && <TabCombustivel />}
      {tabAtiva === 'Manutenção' && <TabManutencao />}
      {tabAtiva === 'Ordens de Serviço' && <TabOrdensServico />}
      {tabAtiva === 'Funcionários' && <TabFuncionarios />}
      {tabAtiva === 'Compras' && <TabCompras />}
      {tabAtiva === 'Estoque' && <TabEstoque />}
      {tabAtiva === 'Frota' && <TabFrota />}
      {tabAtiva === 'Equipamentos' && <TabEquipamentos />}
    </div>
  );
}
