import { useState, useEffect, useRef, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import toast from 'react-hot-toast';
import { exportCsv } from '../../utils/exportCsv';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState } from '../../hooks/useUrlState';
import { Truck, Plus, Gauge, Calendar, Wrench, Search, Download, LayoutGrid, LayoutList } from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { KpiCardSkeleton, TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  useCaminhoes, useFrotaKPIs, useManutencaoVencendo, useDocumentosVencendo,
  useProximosManutencaoKm, type CaminhaoListItem,
} from '../../hooks/useApi';
import { statusFilterOptions, statusFilterLabels } from './frota.constants';
import { BannerManutencao } from './BannerManutencao';
import { BannerDocumentos } from './BannerDocumentos';
import { FrotaGridView } from './FrotaGridView';
import { FrotaListaView } from './FrotaListaView';
import { NovoCaminhaoModal } from './NovoCaminhaoModal';
import { EditarCaminhaoModal } from './EditarCaminhaoModal';

export function FrotaPage() {
  usePageTitle('Frota');
  const [filtro, setFiltro] = useUrlState('status', 'todos');
  const [busca, setBusca] = useUrlState('q', '');
  const [viewMode, setViewMode] = useUrlState('view', 'grid');
  const [filtroManutencao, setFiltroManutencao] = useUrlState('manutencao', '');
  const [page, setPage] = useUrlPageState();
  const [modalNovo, setModalNovo] = useState(false);
  const [editandoCaminhao, setEditandoCaminhao] = useState<CaminhaoListItem | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => setModalNovo(true));
  const debouncedBusca = useDebouncedValue(busca, 300);

  const { data, isLoading, isError } = useCaminhoes(
    page,
    filtroManutencao === '1' ? undefined : (filtro === 'todos' ? undefined : filtro),
    debouncedBusca || undefined,
    20,
    filtroManutencao === '1' ? true : undefined,
  );
  const { data: kpis }                    = useFrotaKPIs();
  const { data: manutencaoAlertas = [] }  = useManutencaoVencendo();
  const { data: documentosAlertas = [] }  = useDocumentosVencendo();
  const { data: proximosKmFrota = [] }    = useProximosManutencaoKm(1000);

  const kmAlertaMap = useMemo(() => new Map(proximosKmFrota.map((r) => [r.id, r])), [proximosKmFrota]);

  const caminhoes = data?.data ?? [];
  const hasFilters = !!(busca || (filtro && filtro !== 'todos') || filtroManutencao);

  function limparFiltros() { setBusca(''); setFiltro('todos'); setFiltroManutencao(''); setPage(1); }
  function toggleFiltroManutencao() { setFiltroManutencao(filtroManutencao === '1' ? '' : '1'); setFiltro('todos'); setPage(1); }

  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportarCSV() {
    exportCsv(
      'frota',
      ['Código', 'Placa', 'Fabricante', 'Modelo', 'Ano', 'KM Atual', 'Status', 'Motorista',
       'Próx. Manutenção (data)', 'KM Manutenção', 'KM Restante', 'Alerta KM', 'Venc. CRLV', 'Venc. Seguro'],
      caminhoes.map((c) => {
        const kmAlerta = kmAlertaMap.get(c.id);
        return [
          c.codigo, c.placa, c.fabricante, c.modelo, c.anoFabricacao, c.kmAtual, c.status, c.motorista?.nome ?? '',
          c.proximaManutencao ? new Date(c.proximaManutencao).toLocaleDateString('pt-BR') : '',
          c.proximaManutencaoKm ?? '',
          kmAlerta ? kmAlerta.kmRestantes : '',
          kmAlerta ? (kmAlerta.urgente ? 'VENCIDA' : 'ALERTA') : '',
          c.vencimentoCrlv ? new Date(c.vencimentoCrlv).toLocaleDateString('pt-BR') : '',
          c.vencimentoSeguro ? new Date(c.vencimentoSeguro).toLocaleDateString('pt-BR') : '',
        ];
      }),
    );
    toast.success('CSV exportado com sucesso!');
  }

  return (
    <div className="space-y-6">
      {isError && (
        <ListErrorBanner />
      )}

      <BannerManutencao alertas={manutencaoAlertas} filtroAtivo={filtroManutencao === '1'} onToggle={toggleFiltroManutencao} />
      <BannerDocumentos alertas={documentosAlertas} />

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${proximosKmFrota.length > 0 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-4`}>
        <button className="text-left" onClick={() => { setFiltro('todos'); setFiltroManutencao(''); setPage(1); }} title="Ver todos os veículos">
          <KPICard title="Total da Frota" value={kpis?.total ?? '—'} subtitle="veículos cadastrados" icon={Truck} color="blue" />
        </button>
        <button className="text-left" onClick={() => { setFiltro('operacional'); setFiltroManutencao(''); setPage(1); }} title="Filtrar operacionais">
          <KPICard title="Operacionais" value={kpis?.operacionais ?? '—'} subtitle={kpis ? `${kpis.taxaDisponibilidade}% disponíveis` : ''} icon={Truck} color="green" />
        </button>
        <button className="text-left" onClick={() => { setFiltro('manutencao'); setFiltroManutencao(''); setPage(1); }} title="Filtrar em manutenção">
          <KPICard title="Em Manutenção" value={kpis?.emManutencao ?? '—'} subtitle="com OS aberta — clique para filtrar" icon={Wrench} color="orange" />
        </button>
        <button className="text-left" onClick={toggleFiltroManutencao} title={filtroManutencao === '1' ? 'Remover filtro de manutenção' : 'Filtrar veículos com manutenção nos próximos 30 dias'}>
          <KPICard title="Manutenção Vencendo" value={kpis?.manutencaoVencendo ?? '—'} subtitle={filtroManutencao === '1' ? 'filtro ativo — clique para remover' : 'próximos 30 dias — clique para filtrar'} icon={Calendar} color="red" />
        </button>
        {proximosKmFrota.length > 0 && (
          <button className="text-left" title={`${proximosKmFrota.filter((c) => c.urgente).length} com KM ultrapassado`}>
            <KPICard title="KM Manutenção" value={proximosKmFrota.length} subtitle={proximosKmFrota.some((c) => c.urgente) ? `${proximosKmFrota.filter((c) => c.urgente).length} com KM vencido` : 'próximos 1000 km do limiar'} icon={Gauge} color={proximosKmFrota.some((c) => c.urgente) ? 'red' : 'orange'} />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} ref={searchRef} placeholder="Buscar caminhão... (/)" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="flex gap-1.5">
            {statusFilterOptions.map((s) => (
              <button key={s} onClick={() => { setFiltro(s); setFiltroManutencao(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filtro === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {statusFilterLabels[s]}
              </button>
            ))}
          </div>
          {filtroManutencao === '1' && (
            <button onClick={() => setFiltroManutencao('')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
              Manutenção Vencendo <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-2 transition ${viewMode !== 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`} title="Visualização em cards">
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-2 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`} title="Visualização em lista">
              <LayoutList size={15} />
            </button>
          </div>
          {caminhoes.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" title="Exportar página atual como CSV">
              <Download size={15} /> CSV
            </button>
          )}
          <button onClick={() => setModalNovo(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Novo Caminhão
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'list'
          ? <TableSkeleton cols={7} rows={8} />
          : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}</div>
      ) : caminhoes.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtroManutencao === '1' ? 'Nenhum veículo com manutenção vencendo' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum caminhão cadastrado'}
          description={filtroManutencao === '1' ? 'Todos os veículos estão com a manutenção em dia.' : hasFilters ? 'Nenhum veículo corresponde aos filtros aplicados.' : 'Cadastre o primeiro veículo da frota para começar a gerenciar.'}
          action={filtroManutencao === '1' ? { label: 'Remover filtro', onClick: () => setFiltroManutencao('') } : hasFilters ? { label: 'Limpar filtros', onClick: limparFiltros } : { label: 'Cadastrar Caminhão', onClick: () => setModalNovo(true), icon: Plus }}
        />
      ) : (
        <>
          {viewMode === 'list' ? (
            <FrotaListaView
              caminhoes={caminhoes}
              onEditar={setEditandoCaminhao}
              onFiltrar={(status) => { setFiltro(status); setFiltroManutencao(''); setPage(1); }}
              onFiltrarFabricante={(fab) => { setBusca(fab); setPage(1); }}
            />
          ) : (
            <FrotaGridView
              caminhoes={caminhoes}
              onEditar={setEditandoCaminhao}
              onFiltrar={(status) => { setFiltro(status); setFiltroManutencao(''); setPage(1); }}
              onFiltrarManutencao={() => { setFiltroManutencao(''); }}
            />
          )}
          <div className="bg-white rounded-2xl border border-gray-100">
            <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} total={data?.pagination?.total ?? 0} perPage={data?.pagination?.perPage ?? 20} onChange={setPage} />
          </div>
        </>
      )}

      <NovoCaminhaoModal open={modalNovo} onClose={() => setModalNovo(false)} />
      <EditarCaminhaoModal caminhao={editandoCaminhao} onClose={() => setEditandoCaminhao(null)} />
    </div>
  );
}
