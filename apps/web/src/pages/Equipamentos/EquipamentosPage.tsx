import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { exportCsv } from '../../utils/exportCsv';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { Wrench, Plus, Search, Package, AlertTriangle, AlertCircle, Download, LayoutGrid, LayoutList } from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { CardSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  useEquipamentos, useEquipamentosKPIs, useEquipamentosRevisoesVencendo,
  type EquipamentoListItem,
} from '../../hooks/useApi';
import type { EquipamentoEditTarget } from './EditarEquipamentoModal';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState } from '../../hooks/useUrlState';
import { tipoLabels } from './equipamentos.constants';
import { BannerRevisoes } from './BannerRevisoes';
import { EquipamentosGridView } from './EquipamentosGridView';
import { EquipamentosListaView } from './EquipamentosListaView';
import { NovoEquipamentoModal } from './NovoEquipamentoModal';
import { EditarEquipamentoModal } from './EditarEquipamentoModal';
import { MovimentarEquipamentoModal } from './MovimentarEquipamentoModal';

export function EquipamentosPage() {
  usePageTitle('Equipamentos');
  const [busca, setBusca] = useUrlState('q', '');
  const [tipoFiltro, setTipoFiltro] = useUrlState('tipo', '');
  const [statusFiltro, setStatusFiltro] = useUrlState('status', '');
  const [filtroRevisao, setFiltroRevisao] = useUrlState('revisao', '');
  const [viewMode, setViewMode] = useUrlState('view', 'grid');
  const [page, setPage] = useUrlPageState();
  const [modalNovo, setModalNovo] = useState(false);
  const [movimentandoId, setMovimentandoId] = useState<string | null>(null);
  const [editandoEquipamento, setEditandoEquipamento] = useState<EquipamentoEditTarget | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => setModalNovo(true));
  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useEquipamentos(
    page, debouncedBusca,
    filtroRevisao === '1' ? undefined : (tipoFiltro || undefined),
    filtroRevisao === '1' ? undefined : (statusFiltro || undefined),
    filtroRevisao === '1' ? true : undefined,
  );
  const { data: kpis } = useEquipamentosKPIs();
  const { data: revisoesVencendo = [] } = useEquipamentosRevisoesVencendo();

  const equipamentos: EquipamentoListItem[] = data?.data ?? [];
  const hasFilters = !!(busca || tipoFiltro || statusFiltro || filtroRevisao);

  function mudarFiltro(fn: () => void) { fn(); setPage(1); }
  function limparFiltros() { mudarFiltro(() => { setBusca(''); setTipoFiltro(''); setStatusFiltro(''); setFiltroRevisao(''); }); }
  function toggleFiltroRevisao() { mudarFiltro(() => { setFiltroRevisao(filtroRevisao === '1' ? '' : '1'); setTipoFiltro(''); setStatusFiltro(''); }); }

  function exportarCSV() {
    exportCsv(
      'equipamentos',
      ['Código', 'Nome', 'Tipo', 'Fabricante', 'Modelo', 'Nº Série', 'Localização', 'Status', 'Valor Aquisição (R$)', 'Próx. Revisão'],
      equipamentos.map((eq) => [
        eq.codigo, eq.nome, tipoLabels[eq.tipo] ?? eq.tipo,
        eq.fabricante ?? '', eq.modelo ?? '', eq.numeroSerie ?? '', eq.localizacao ?? '',
        eq.status, eq.valorAquisicao?.toFixed(2) ?? '',
        eq.proximaRevisao ? new Date(eq.proximaRevisao).toLocaleDateString('pt-BR') : '',
      ]),
    );
    toast.success('CSV exportado com sucesso!');
  }

  return (
    <div className="space-y-6">
      {isError && (
        <ListErrorBanner />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total de Itens" value={kpis?.total ?? '—'} subtitle="equipamentos e ferramentas" icon={Package} color="blue" />
        <button className="text-left" onClick={() => mudarFiltro(() => { setStatusFiltro('disponivel'); setFiltroRevisao(''); })} title="Filtrar disponíveis">
          <KPICard title="Disponíveis" value={kpis?.disponiveis ?? '—'} subtitle="prontos para uso — clique para filtrar" icon={Wrench} color="green" />
        </button>
        <button className="text-left" onClick={() => mudarFiltro(() => { setStatusFiltro('em_uso'); setFiltroRevisao(''); })} title="Filtrar em uso">
          <KPICard title="Em Uso / Manutenção" value={kpis ? `${kpis.emUso} / ${kpis.manutencao}` : '—'} subtitle="alocados ou em reparo — clique para filtrar" icon={AlertTriangle} color="orange" />
        </button>
        <button className="text-left" onClick={toggleFiltroRevisao} title={filtroRevisao === '1' ? 'Remover filtro de revisão' : 'Filtrar itens com revisão vencendo ou vencida'}>
          <KPICard
            title="Revisão Vencendo"
            value={kpis?.revisaoVencendo ?? '—'}
            subtitle={filtroRevisao === '1' ? 'filtro ativo — clique para remover' : 'próximos 30 dias — clique para filtrar'}
            icon={AlertCircle}
            color={(kpis?.revisaoVencendo ?? 0) > 0 ? 'red' : 'green'}
          />
        </button>
      </div>

      <BannerRevisoes
        alertas={revisoesVencendo}
        filtroAtivo={filtroRevisao === '1'}
        onToggle={toggleFiltroRevisao}
        onEditar={setEditandoEquipamento}
      />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              ref={searchRef} placeholder="Buscar equipamento... (/)"
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <select value={tipoFiltro} onChange={(e) => mudarFiltro(() => { setTipoFiltro(e.target.value); setFiltroRevisao(''); })} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
            <option value="">Todos os tipos</option>
            <option value="equipamento">Equipamentos</option>
            <option value="ferramenta">Ferramentas</option>
            <option value="veiculo_apoio">Veículos de Apoio</option>
          </select>
          <select value={statusFiltro} onChange={(e) => mudarFiltro(() => { setStatusFiltro(e.target.value); setFiltroRevisao(''); })} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
            <option value="">Todos os status</option>
            <option value="disponivel">Disponíveis</option>
            <option value="em_uso">Em Uso</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="descartado">Descartados</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {filtroRevisao === '1' && (
            <button onClick={() => setFiltroRevisao('')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
              Revisão Vencendo <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
          {equipamentos.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" title="Exportar página atual como CSV">
              <Download size={15} /> CSV
            </button>
          )}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-2 transition ${viewMode !== 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`} title="Visualização em cards"><LayoutGrid size={15} /></button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-2 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`} title="Visualização em lista"><LayoutList size={15} /></button>
          </div>
          <button onClick={() => setModalNovo(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Novo Item
          </button>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'list'
          ? <TableSkeleton cols={7} rows={8} />
          : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : equipamentos.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={filtroRevisao === '1' ? 'Nenhum equipamento com revisão vencendo' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}
          description={filtroRevisao === '1' ? 'Todos os equipamentos estão com a revisão em dia.' : hasFilters ? 'Nenhum equipamento corresponde aos filtros aplicados.' : 'Cadastre equipamentos e ferramentas da OMP para começar.'}
          action={filtroRevisao === '1'
            ? { label: 'Remover filtro', onClick: () => setFiltroRevisao('') }
            : hasFilters
            ? { label: 'Limpar filtros', onClick: limparFiltros }
            : { label: 'Cadastrar Item', onClick: () => setModalNovo(true), icon: Plus }}
        />
      ) : viewMode === 'list' ? (
        <EquipamentosListaView
          equipamentos={equipamentos}
          onEditar={(eq) => setEditandoEquipamento(eq)}
          onMovimentar={setMovimentandoId}
          onFiltrarTipo={(tipo) => mudarFiltro(() => { setTipoFiltro(tipo); setFiltroRevisao(''); })}
          onFiltrarStatus={(status) => mudarFiltro(() => { setStatusFiltro(status); setFiltroRevisao(''); })}
        />
      ) : (
        <EquipamentosGridView
          equipamentos={equipamentos}
          onEditar={(eq) => setEditandoEquipamento(eq)}
          onMovimentar={setMovimentandoId}
          onFiltrarTipo={(tipo) => mudarFiltro(() => { setTipoFiltro(tipo); setFiltroRevisao(''); })}
          onFiltrarStatus={(status) => mudarFiltro(() => { setStatusFiltro(status); setFiltroRevisao(''); })}
          onSwitchToList={() => setViewMode('list')}
        />
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} perPage={data.pagination.perPage} onChange={setPage} />
        </div>
      )}

      <NovoEquipamentoModal open={modalNovo} onClose={() => setModalNovo(false)} />
      <EditarEquipamentoModal equipamento={editandoEquipamento} onClose={() => setEditandoEquipamento(null)} />
      <MovimentarEquipamentoModal equipamentoId={movimentandoId} onClose={() => setMovimentandoId(null)} />
    </div>
  );
}
