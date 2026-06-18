import { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, AlertCircle, ExternalLink, Plus, ClipboardX,
} from 'lucide-react';
import { SortableTh } from '../../components/ui/SortableTh';
import { RelDate } from '../../components/ui/RelDate';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useSortState } from '../../hooks/useUrlState';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { allowedTransitions, statusLabels, prioridadeWeight, isAtrasada } from './os.constants';
import type { OrdemServicoListItem } from '../../hooks/useApi';

interface CaminhaoRef { id: string; codigo: string; placa: string; }

export interface ListaFilters {
  busca: string; setBusca: (v: string) => void;
  caminhaoFiltro: string; setCaminhaoFiltro: (v: string) => void;
  statusFiltro: string; setStatusFiltro: (v: string) => void;
  tipoFiltro: string; setTipoFiltro: (v: string) => void;
  prioridadeFiltro: string; setPrioridadeFiltro: (v: string) => void;
  dataDe: string; setDataDe: (v: string) => void;
  dataAte: string; setDataAte: (v: string) => void;
  filtroAtrasada: string; setFiltroAtrasada: (v: string) => void;
  responsavelFiltro: string; setResponsavelFiltro: (v: string) => void;
}

interface Props {
  ordens: OrdemServicoListItem[];
  isLoading: boolean;
  pagination: { total: number; totalPages: number; perPage: number } | undefined;
  caminhoes: CaminhaoRef[];
  page: number;
  setPage: (p: number) => void;
  filters: ListaFilters;
  onMove: (os: OrdemServicoListItem, status: string) => void;
  onOpenNovaOs: () => void;
}

export function OsListaView({
  ordens, isLoading, pagination, caminhoes, page, setPage, filters, onMove, onOpenNovaOs,
}: Props) {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => filters.setBusca(''));

  const { sortField, sortDir, toggleSort } = useSortState();

  const sortedOrdens = useMemo(() => {
    if (!sortField) return ordens;
    return [...ordens].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === 'codigo')          { va = a.codigo;                           vb = b.codigo; }
      else if (sortField === 'caminhao')   { va = a.caminhao?.codigo ?? '';            vb = b.caminhao?.codigo ?? ''; }
      else if (sortField === 'tipo')       { va = a.tipo;                              vb = b.tipo; }
      else if (sortField === 'status')     { va = a.status;                            vb = b.status; }
      else if (sortField === 'prioridade') { va = prioridadeWeight[a.prioridade] ?? 0; vb = prioridadeWeight[b.prioridade] ?? 0; }
      else if (sortField === 'previsao')   { va = new Date(a.dataPrevisao).getTime();  vb = new Date(b.dataPrevisao).getTime(); }
      else if (sortField === 'abertura')   { va = new Date(a.dataAbertura).getTime();  vb = new Date(b.dataAbertura).getTime(); }
      else if (sortField === 'custo')      { va = a.custoTotal ?? 0;                   vb = b.custoTotal ?? 0; }
      else { va = ''; vb = ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordens, sortField, sortDir]);

  const f = filters;
  const hasFilters = !!(f.busca || f.caminhaoFiltro || f.statusFiltro || f.tipoFiltro || f.prioridadeFiltro || f.dataDe || f.dataAte || f.filtroAtrasada || f.responsavelFiltro);

  function limparFiltros() {
    f.setBusca(''); f.setCaminhaoFiltro(''); f.setStatusFiltro(''); f.setTipoFiltro('');
    f.setPrioridadeFiltro(''); f.setDataDe(''); f.setDataAte(''); f.setFiltroAtrasada('');
    f.setResponsavelFiltro(''); setPage(1);
  }

  const selectCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';

  return (
    <>
      {/* List filters toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            ref={searchRef}
            placeholder="Buscar código, descrição, placa... (/)"
            value={f.busca}
            onChange={(e) => { f.setBusca(e.target.value); setPage(1); }}
            className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-52"
          />
        </div>
        <select value={f.caminhaoFiltro} onChange={(e) => { f.setCaminhaoFiltro(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Todos os caminhões</option>
          {caminhoes.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.placa}</option>)}
        </select>
        <select value={f.statusFiltro} onChange={(e) => { f.setStatusFiltro(e.target.value); f.setFiltroAtrasada(''); setPage(1); }} className={selectCls}>
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([s, l]) => <option key={s} value={s}>{l}</option>)}
        </select>
        <select value={f.tipoFiltro} onChange={(e) => { f.setTipoFiltro(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Todos os tipos</option>
          <option value="preventiva">Preventiva</option>
          <option value="corretiva">Corretiva</option>
        </select>
        <select value={f.prioridadeFiltro} onChange={(e) => { f.setPrioridadeFiltro(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Todas as prioridades</option>
          <option value="critica">Crítica</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
        <Calendar size={13} className="text-gray-400 ml-1" />
        <span>Abertura:</span>
        <input type="date" value={f.dataDe} onChange={(e) => { f.setDataDe(e.target.value); setPage(1); }} className={selectCls} />
        <span>até</span>
        <input type="date" value={f.dataAte} onChange={(e) => { f.setDataAte(e.target.value); setPage(1); }} className={selectCls} />
        {f.filtroAtrasada === '1' && (
          <button onClick={() => f.setFiltroAtrasada('')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
            Atrasadas <span className="ml-0.5 font-bold">×</span>
          </button>
        )}
        {f.responsavelFiltro && (
          <button onClick={() => { f.setResponsavelFiltro(''); setPage(1); }} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition">
            Responsável <span className="ml-0.5 font-bold">×</span>
          </button>
        )}
        {hasFilters && (
          <button onClick={limparFiltros} className="text-red-400 hover:text-red-600 text-xs font-medium">Limpar</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!isLoading && sortedOrdens.length === 0 ? (
          <EmptyState
            icon={ClipboardX}
            title={f.filtroAtrasada === '1' ? 'Nenhuma OS atrasada' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhuma OS encontrada'}
            description={f.filtroAtrasada === '1' ? 'Todas as OS ativas estão dentro do prazo.' : hasFilters ? 'Nenhuma OS corresponde aos filtros aplicados.' : 'Abra a primeira ordem de serviço para começar.'}
            action={
              f.filtroAtrasada === '1'
                ? { label: 'Remover filtro', onClick: () => f.setFiltroAtrasada('') }
                : hasFilters
                  ? { label: 'Limpar filtros', onClick: limparFiltros }
                  : { label: 'Nova OS', onClick: onOpenNovaOs, icon: Plus }
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: 'Código',      field: 'codigo' },
                    { label: 'Caminhão',    field: 'caminhao' },
                    { label: 'Descrição',   field: '' },
                    { label: 'Tipo',        field: 'tipo' },
                    { label: 'Status',      field: 'status' },
                    { label: 'Prioridade',  field: 'prioridade' },
                    { label: 'Responsável', field: '' },
                    { label: 'Previsão',    field: 'previsao' },
                    { label: 'Aberta há',   field: 'abertura' },
                    { label: 'Custo',       field: 'custo' },
                    { label: '',            field: '' },
                  ].map(({ label, field }) => (
                    <SortableTh key={label} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={toggleSort} px="px-4" />
                  ))}
                </tr>
              </thead>
              {isLoading ? (
                <TableSkeleton rows={5} cols={10} />
              ) : (
                <tbody className="divide-y divide-gray-50">
                  {sortedOrdens.map((os) => {
                    const nextStatuses = allowedTransitions[os.status] ?? [];
                    return (
                      <tr
                        key={os.id}
                        className="hover:bg-gray-50/50 transition cursor-pointer group"
                        onClick={() => navigate(`/ordens-servico/${os.id}`)}
                      >
                        <td className="px-4 py-3"><CopyText text={os.codigo} className="text-sm font-mono font-bold text-blue-600" /></td>
                        <td className="px-4 py-3">
                          {os.caminhao ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/frota/${os.caminhao!.id}`); }}
                              className="text-left group"
                              title="Ver detalhes do veículo"
                            >
                              <CopyText text={os.caminhao.codigo} className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition" />
                              <CopyText text={os.caminhao.placa} className="text-xs text-gray-400 font-mono" />
                            </button>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{os.descricao}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); f.setTipoFiltro(os.tipo); setPage(1); }}
                            className="hover:opacity-75 transition"
                            title={`Filtrar por tipo: ${os.tipo}`}
                          >
                            <StatusBadge status={os.tipo} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); f.setStatusFiltro(os.status); f.setFiltroAtrasada(''); setPage(1); }}
                            className="hover:opacity-75 transition"
                            title={`Filtrar por status: ${os.status}`}
                          >
                            <StatusBadge status={os.status} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); f.setPrioridadeFiltro(os.prioridade); setPage(1); }}
                            className="hover:opacity-75 transition"
                            title={`Filtrar por prioridade: ${os.prioridade}`}
                          >
                            <StatusBadge status={os.prioridade} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {os.responsavel ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${os.responsavel!.id}`); }}
                              className="text-sm text-gray-600 hover:text-blue-600 transition text-left"
                              title="Ver perfil do responsável"
                            >
                              {os.responsavel.nome}
                            </button>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isAtrasada(os) && <AlertCircle size={12} className="text-red-500 flex-shrink-0" />}
                            <RelDate date={os.dataPrevisao} className={`text-sm ${isAtrasada(os) ? 'text-red-600 font-medium' : 'text-gray-500'}`} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const dias = Math.floor((Date.now() - new Date(os.dataAbertura).getTime()) / 86400000);
                            const finalizada = ['concluida', 'cancelada'].includes(os.status);
                            if (finalizada) return <span className="text-xs text-gray-300">—</span>;
                            const cor = dias > 30 ? 'text-red-600 font-semibold' : dias > 14 ? 'text-amber-600 font-medium' : 'text-gray-500';
                            return <span className={`text-sm ${cor}`}>{dias}d</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {os.custoTotal ? `R$ ${os.custoTotal.toLocaleString('pt-BR')}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {nextStatuses.length > 0 && (
                              <select
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-600"
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => { if (e.target.value) onMove(os, e.target.value); }}
                              >
                                <option value="" disabled>Mover para...</option>
                                {nextStatuses.map((s) => (
                                  <option key={s} value={s}>{statusLabels[s]}</option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico/${os.id}`); }}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink size={11} /> Ver
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        )}
        {!isLoading && sortedOrdens.length > 0 && pagination && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            perPage={pagination.perPage}
            onChange={setPage}
          />
        )}
      </div>
    </>
  );
}
