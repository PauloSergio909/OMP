import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { exportCsv } from '../../utils/exportCsv';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState } from '../../hooks/useUrlState';
import { KPICard } from '../../components/ui/KPICard';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import {
  useOrdensServico, useAtualizarStatusOS, useCaminhoes, useOrdensServicoKPIs,
  type OrdemServicoListItem,
} from '../../hooks/useApi';
import { OsKanbanView } from './OsKanbanView';
import { OsListaView } from './OsListaView';
import { NovaOsModal } from './NovaOsModal';

export function OrdensServicoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle('Ordens de Serviço');

  const [viewModeStr, setViewMode] = useUrlState('view', 'kanban');
  const viewMode = viewModeStr as 'kanban' | 'lista';
  const [page, setPage] = useUrlPageState();

  // Filtros da view lista (URL state — compartilhados com KPI cards)
  const [busca, setBusca] = useUrlState('q', '');
  const [caminhaoFiltro, setCaminhaoFiltro] = useUrlState('caminhao', '');
  const [statusFiltro, setStatusFiltro] = useUrlState('status', '');
  const [tipoFiltro, setTipoFiltro] = useUrlState('tipo', '');
  const [prioridadeFiltro, setPrioridadeFiltro] = useUrlState('prioridade', '');
  const [dataDe, setDataDe] = useUrlState('de', '');
  const [dataAte, setDataAte] = useUrlState('ate', '');
  const [filtroAtrasada, setFiltroAtrasada] = useUrlState('atrasada', '');
  const [responsavelFiltro, setResponsavelFiltro] = useUrlState('responsavel', '');

  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modalOS, setModalOS] = useState(false);
  const [initialCaminhaoId, setInitialCaminhaoId] = useState('');
  const [confirmCancelar, setConfirmCancelar] = useState<{ id: string; codigo: string } | null>(null);

  useNewShortcut(() => setModalOS(true));

  // Abrir modal com caminhão pré-selecionado quando navegado de CaminhaoDetalhe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openNew') === '1') {
      setInitialCaminhaoId(params.get('caminhao') ?? '');
      setModalOS(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, isError, refetch } = useOrdensServico(
    viewMode === 'kanban' ? 1 : page,
    viewMode === 'lista' ? statusFiltro || undefined : undefined,
    viewMode === 'lista' ? tipoFiltro || undefined : undefined,
    viewMode === 'kanban' ? 100 : 20,
    viewMode === 'lista' ? dataDe || undefined : undefined,
    viewMode === 'lista' ? dataAte || undefined : undefined,
    viewMode === 'lista' ? debouncedBusca || undefined : undefined,
    viewMode === 'lista' ? caminhaoFiltro || undefined : undefined,
    viewMode === 'lista' ? prioridadeFiltro || undefined : undefined,
    viewMode === 'lista' && filtroAtrasada === '1' ? true : undefined,
    viewMode === 'lista' ? responsavelFiltro || undefined : undefined,
  );
  const { data: kpis } = useOrdensServicoKPIs();
  const { data: caminhoesList } = useCaminhoes(1, undefined, undefined, 200);
  const atualizarStatus = useAtualizarStatusOS();

  const ordens = data?.data ?? [];
  const caminhoes = caminhoesList?.data ?? [];

  async function moverOS(id: string, novoStatus: string) {
    try {
      await atualizarStatus.mutateAsync({ id, status: novoStatus });
    } catch { /* handled by onError in hook */ }
  }

  function solicitarMover(os: OrdemServicoListItem, novoStatus: string) {
    if (novoStatus === 'cancelada') {
      setConfirmCancelar({ id: os.id, codigo: os.codigo });
    } else {
      moverOS(os.id, novoStatus);
    }
  }

  function exportarCSV() {
    exportCsv(
      'ordens-servico',
      ['Código', 'Caminhão', 'Placa', 'Tipo', 'Status', 'Prioridade', 'Responsável', 'Previsão', 'Custo'],
      ordens.map((os) => [
        os.codigo, os.caminhao?.codigo ?? '', os.caminhao?.placa ?? '',
        os.tipo, os.status, os.prioridade, os.responsavel?.nome ?? '',
        os.dataPrevisao ? new Date(os.dataPrevisao).toLocaleDateString('pt-BR') : '',
        os.custoTotal ?? '',
      ]),
    );
    toast.success('CSV exportado com sucesso!');
  }

  const listaFilters = {
    busca, setBusca, caminhaoFiltro, setCaminhaoFiltro,
    statusFiltro, setStatusFiltro, tipoFiltro, setTipoFiltro,
    prioridadeFiltro, setPrioridadeFiltro, dataDe, setDataDe,
    dataAte, setDataAte, filtroAtrasada, setFiltroAtrasada,
    responsavelFiltro, setResponsavelFiltro,
  };

  const totalAbertas  = kpis?.abertas ?? '—';
  const urgentes      = kpis?.urgentes ?? '—';
  const concluidasMes = kpis?.concluidasMes ?? '—';
  const custoMes      = kpis?.custoMes ?? 0;
  const totalAtrasadas = kpis?.atrasadas;

  return (
    <div className="space-y-6">
      {isError && (
        <ListErrorBanner />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button className="text-left" onClick={() => { setViewMode('lista'); setStatusFiltro('aberta'); setFiltroAtrasada(''); setPage(1); }}>
          <KPICard title="OS Abertas" value={totalAbertas} subtitle={urgentes !== '—' ? `${urgentes} urgente${urgentes !== 1 ? 's' : ''}` : '—'} icon={ClipboardList} color="orange" />
        </button>
        <button className="text-left" onClick={() => { setViewMode('lista'); setStatusFiltro('concluida'); setFiltroAtrasada(''); setPage(1); }}>
          <KPICard title="Concluídas (mês)" value={concluidasMes} subtitle="no mês corrente" icon={ClipboardList} color="green" />
        </button>
        <button className="text-left" onClick={() => { setViewMode('lista'); setFiltroAtrasada('1'); setPrioridadeFiltro(''); setStatusFiltro(''); setPage(1); }}>
          <KPICard title="Atrasadas" value={totalAtrasadas ?? '—'} subtitle="previsão vencida" icon={AlertCircle} color={(totalAtrasadas ?? 0) > 0 ? 'red' : 'blue'} />
        </button>
        <KPICard title="Custo (mês)" value={`R$ ${(custoMes / 1000).toFixed(1)}k`} subtitle="materiais + mão de obra" icon={ClipboardList} color="purple" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1.5">
          {(['kanban', 'lista'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setViewMode(m); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                viewMode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {m === 'kanban' ? 'Kanban' : 'Lista'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'lista' && ordens.length > 0 && (
            <button
              onClick={exportarCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Download size={14} /> CSV
            </button>
          )}
          <button
            onClick={() => { setInitialCaminhaoId(''); setModalOS(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={15} /> Nova OS
          </button>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'kanban' && (
        <OsKanbanView
          ordens={ordens}
          isLoading={isLoading}
          caminhoes={caminhoes}
          onMove={solicitarMover}
          onRefetch={refetch}
        />
      )}
      {viewMode === 'lista' && (
        <OsListaView
          ordens={ordens}
          isLoading={isLoading}
          pagination={data?.pagination}
          caminhoes={caminhoes}
          page={page}
          setPage={setPage}
          filters={listaFilters}
          onMove={solicitarMover}
          onOpenNovaOs={() => { setInitialCaminhaoId(''); setModalOS(true); }}
        />
      )}

      <ConfirmModal
        open={confirmCancelar !== null}
        onClose={() => setConfirmCancelar(null)}
        onConfirm={async () => {
          if (!confirmCancelar) return;
          try {
            await atualizarStatus.mutateAsync({ id: confirmCancelar.id, status: 'cancelada' });
            setConfirmCancelar(null);
          } catch { /* handled by onError in hook */ }
        }}
        title="Cancelar Ordem de Serviço"
        message={`Tem certeza que deseja cancelar a OS ${confirmCancelar?.codigo ?? ''}? Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmLabel="Cancelar OS"
        cancelLabel="Voltar"
        loading={atualizarStatus.isPending}
      />

      <NovaOsModal
        open={modalOS}
        onClose={() => setModalOS(false)}
        initialCaminhaoId={initialCaminhaoId}
      />
    </div>
  );
}
