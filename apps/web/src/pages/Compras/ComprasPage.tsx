import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { exportCsv } from '../../utils/exportCsv';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { CopyText } from '../../components/ui/CopyText';
import { ShoppingCart, Plus, Package, CheckCircle, Clock, XCircle, DollarSign, ExternalLink, Search, Download, AlertCircle } from 'lucide-react';
import { SortableTh } from '../../components/ui/SortableTh';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState, useSortState } from '../../hooks/useUrlState';
import { RelDate } from '../../components/ui/RelDate';
import { KPICard } from '../../components/ui/KPICard';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useCompras, useComprasKPIs, type CompraListItem } from '../../hooks/useApi';
import { statusLabels, statusColors, statusOptions } from './compras.constants';
import { NovaOCModal } from './NovaOCModal';
import { AtualizarStatusOCModal } from './AtualizarStatusOCModal';

export function ComprasPage() {
  const navigate = useNavigate();
  usePageTitle('Compras');
  const [page, setPage] = useUrlPageState();
  const [filtroStatus, setFiltroStatus] = useUrlState('status', '');
  const [busca, setBusca] = useUrlState('q', '');
  const [filtroDe, setFiltroDe] = useUrlState('de', '');
  const [filtroAte, setFiltroAte] = useUrlState('ate', '');
  const [filtroAtrasada, setFiltroAtrasada] = useUrlState('atrasada', '');
  const { sortField, sortDir, toggleSort } = useSortState();
  const [modalNova, setModalNova] = useState(false);
  const [ocStatus, setOcStatus] = useState<{ id: string; status: string; codigo: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => setModalNova(true));
  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useCompras(page, filtroStatus || undefined, debouncedBusca || undefined, filtroDe || undefined, filtroAte || undefined, filtroAtrasada === '1' ? true : undefined);
  const { data: kpis } = useComprasKPIs();
  const compras: CompraListItem[] = data?.data ?? [];
  const hasFilters = !!(busca || filtroStatus || filtroDe || filtroAte || filtroAtrasada);

  function limparFiltros() { setBusca(''); setFiltroStatus(''); setFiltroDe(''); setFiltroAte(''); setFiltroAtrasada(''); setPage(1); }

  function isOCAtrasada(oc: CompraListItem) {
    if (['recebida', 'cancelada'].includes(oc.status)) return false;
    if (!oc.dataEntrega) return false;
    return new Date(oc.dataEntrega) < new Date();
  }
  const totalAtrasadas = useMemo(() => compras.filter(isOCAtrasada).length, [compras]);
  const countAtrasadas = filtroAtrasada === '1' ? (data?.pagination?.total ?? kpis?.atrasadas ?? 0) : (kpis?.atrasadas ?? totalAtrasadas);

  const sortedCompras = useMemo(() => {
    if (!sortField) return compras;
    return [...compras].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === 'codigo')      { va = a.codigo;                           vb = b.codigo; }
      else if (sortField === 'fornecedor') { va = a.fornecedor?.razaoSocial ?? ''; vb = b.fornecedor?.razaoSocial ?? ''; }
      else if (sortField === 'valor')  { va = a.valorTotal;                       vb = b.valorTotal; }
      else if (sortField === 'status') { va = a.status;                            vb = b.status; }
      else if (sortField === 'pedido') { va = new Date(a.dataPedido).getTime();   vb = new Date(b.dataPedido).getTime(); }
      else if (sortField === 'entrega') { va = a.dataEntrega ? new Date(a.dataEntrega).getTime() : 0; vb = b.dataEntrega ? new Date(b.dataEntrega).getTime() : 0; }
      else { va = ''; vb = ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [compras, sortField, sortDir]);

  function exportarCSV() {
    exportCsv(
      'ordens-compra',
      ['Código', 'Fornecedor', 'CNPJ', 'Itens', 'Valor Total (R$)', 'Status', 'Data Pedido', 'Prev. Entrega'],
      compras.map((oc) => [
        oc.codigo, oc.fornecedor?.razaoSocial ?? '', oc.fornecedor?.cnpj ?? '',
        oc.itens?.length ?? 0, oc.valorTotal?.toFixed(2) ?? '',
        statusLabels[oc.status] ?? oc.status,
        new Date(oc.dataPedido).toLocaleDateString('pt-BR'),
        oc.dataEntrega ? new Date(oc.dataEntrega).toLocaleDateString('pt-BR') : '',
      ]),
    );
    toast.success('CSV exportado com sucesso!');
  }

  return (
    <div className="space-y-6">
      {isError && (
        <ListErrorBanner />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <button className="text-left" onClick={() => { setFiltroStatus('pendente'); setFiltroAtrasada(''); setPage(1); }} title="Filtrar pendentes">
          <KPICard title="Pendentes" value={kpis?.pendentes ?? '—'} subtitle="aguardando aprovação" icon={Clock} color="orange" />
        </button>
        <button className="text-left" onClick={() => { setFiltroStatus('aprovada'); setFiltroAtrasada(''); setPage(1); }} title="Filtrar aprovadas">
          <KPICard title="Aprovadas" value={kpis?.aprovadas ?? '—'} subtitle="aguardando entrega" icon={CheckCircle} color="blue" />
        </button>
        <button className="text-left" onClick={() => { setFiltroStatus('recebida'); setFiltroAtrasada(''); setPage(1); }} title="Filtrar recebidas">
          <KPICard title="Recebidas" value={kpis?.recebidas ?? '—'} subtitle="concluídas" icon={Package} color="green" />
        </button>
        <button className="text-left" onClick={() => { setFiltroStatus('cancelada'); setFiltroAtrasada(''); setPage(1); }} title="Filtrar canceladas">
          <KPICard title="Canceladas" value={kpis?.canceladas ?? '—'} subtitle="canceladas" icon={XCircle} color="red" />
        </button>
        <button className="text-left" onClick={() => { setFiltroAtrasada(filtroAtrasada === '1' ? '' : '1'); setFiltroStatus(''); setPage(1); }}>
          <KPICard
            title="Valor em Aberto"
            value={kpis?.valorEmAberto ? `R$ ${(kpis.valorEmAberto / 1000).toFixed(1)}k` : '—'}
            subtitle={filtroAtrasada === '1' ? 'filtro ativo — clique para remover' : (kpis?.atrasadas ?? 0) > 0 ? `${kpis!.atrasadas} atrasada${kpis!.atrasadas !== 1 ? 's' : ''} — clique para filtrar` : 'pendente + aprovada'}
            icon={DollarSign}
            color={(kpis?.atrasadas ?? 0) > 0 ? 'red' : 'purple'}
          />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" ref={searchRef} placeholder="Fornecedor ou código... (/)" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-44" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statusOptions.map((s) => (
              <button key={s} onClick={() => { setFiltroStatus(s === 'todos' ? '' : s); setFiltroAtrasada(''); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${(s === 'todos' ? filtroStatus === '' : filtroStatus === s) ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                {s === 'todos' ? 'Todos' : statusLabels[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={filtroDe} onChange={(e) => { setFiltroDe(e.target.value); setPage(1); }} title="Data pedido de" className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={filtroAte} onChange={(e) => { setFiltroAte(e.target.value); setPage(1); }} title="Data pedido até" className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          {filtroAtrasada === '1' && (
            <button onClick={() => setFiltroAtrasada('')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
              Atrasadas <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
        </div>
        <div className="flex items-center gap-2">
          {(countAtrasadas > 0 || filtroAtrasada === '1') && (
            <button onClick={() => { setFiltroAtrasada(filtroAtrasada === '1' ? '' : '1'); setFiltroStatus(''); setPage(1); }} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${filtroAtrasada === '1' ? 'bg-red-600 text-white border-red-600' : 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'}`}>
              <AlertCircle size={13} /> {countAtrasadas} atrasada{countAtrasadas !== 1 ? 's' : ''}
            </button>
          )}
          {compras.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition" title="Exportar CSV">
              <Download size={14} /> CSV
            </button>
          )}
          <button onClick={() => setModalNova(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Nova Ordem de Compra
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { label: 'Código',        field: 'codigo' },
                  { label: 'Fornecedor',    field: 'fornecedor' },
                  { label: 'Itens',         field: '' },
                  { label: 'Valor Total',   field: 'valor' },
                  { label: 'Status',        field: 'status' },
                  { label: 'Data Pedido',   field: 'pedido' },
                  { label: 'Prev. Entrega', field: 'entrega' },
                  { label: 'Ação',          field: '' },
                ].map(({ label, field }) => (
                  <SortableTh key={label} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={toggleSort} px="px-4" />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : compras.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={ShoppingCart}
                    title={filtroAtrasada === '1' ? 'Nenhuma compra atrasada' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhuma ordem de compra'}
                    description={filtroAtrasada === '1' ? 'Todas as ordens de compra estão dentro do prazo.' : hasFilters ? 'Nenhuma OC corresponde aos filtros aplicados.' : 'Crie a primeira OC para iniciar o processo de compras.'}
                    action={filtroAtrasada === '1' ? { label: 'Remover filtro', onClick: () => setFiltroAtrasada('') } : hasFilters ? { label: 'Limpar filtros', onClick: limparFiltros } : { label: 'Nova OC', onClick: () => setModalNova(true), icon: Plus }}
                  />
                </td></tr>
              ) : sortedCompras.map((oc) => (
                <tr key={oc.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/compras/${oc.id}`)}>
                  <td className="px-4 py-3"><CopyText text={oc.codigo} className="text-sm font-mono font-bold text-blue-600" /></td>
                  <td className="px-4 py-3">
                    {oc.fornecedor?.razaoSocial ? (
                      <button onClick={(e) => { e.stopPropagation(); setBusca(oc.fornecedor!.razaoSocial); setPage(1); }} className="text-sm font-medium text-gray-800 hover:text-blue-600 transition text-left" title="Filtrar OCs deste fornecedor">
                        {oc.fornecedor.razaoSocial}
                      </button>
                    ) : <span className="text-sm text-gray-400">—</span>}
                    {oc.fornecedor?.cnpj && <CopyText text={oc.fornecedor.cnpj} className="text-xs text-gray-400 font-mono" />}
                  </td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{oc.itens?.length ?? 0} {oc.itens?.length === 1 ? 'item' : 'itens'}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">R$ {oc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={(e) => { e.stopPropagation(); setFiltroStatus(oc.status); setFiltroAtrasada(''); setPage(1); }} className={`text-xs font-medium px-2.5 py-1 rounded-full border hover:opacity-75 transition ${statusColors[oc.status] ?? ''}`} title={`Filtrar por ${statusLabels[oc.status] ?? oc.status}`}>
                        {statusLabels[oc.status] ?? oc.status}
                      </button>
                      {isOCAtrasada(oc) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          <AlertCircle size={9} /> Atrasada
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500"><RelDate date={oc.dataPedido} /></td>
                  <td className="px-4 py-3">
                    {oc.dataEntrega ? <RelDate date={oc.dataEntrega} className={`text-sm ${isOCAtrasada(oc) ? 'text-red-600 font-medium' : 'text-gray-500'}`} /> : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/compras/${oc.id}`); }} className="p-1.5 rounded-lg hover:bg-blue-50 transition text-blue-400 opacity-0 group-hover:opacity-100" aria-label="Ver detalhes da OC">
                        <ExternalLink size={14} />
                      </button>
                      {!['recebida', 'cancelada'].includes(oc.status) && (
                        <button onClick={(e) => { e.stopPropagation(); setOcStatus({ id: oc.id, status: oc.status, codigo: oc.codigo }); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100">
                          Atualizar →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {compras.length > 0 && (() => {
              const valorTotal = compras.reduce((s, c) => s + (c.valorTotal ?? 0), 0);
              const emAberto = compras.filter((c) => ['pendente', 'aprovada'].includes(c.status)).reduce((s, c) => s + (c.valorTotal ?? 0), 0);
              return (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">{compras.length} ordem{compras.length !== 1 ? 'ns' : ''} — total:</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2} className="px-4 py-3 text-xs text-gray-500">{emAberto > 0 && <span className="text-amber-600 font-medium">R$ {emAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aberto</span>}</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
        <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} total={data?.pagination?.total ?? 0} perPage={data?.pagination?.perPage ?? 20} onChange={setPage} />
      </div>

      <NovaOCModal open={modalNova} onClose={() => setModalNova(false)} />
      <AtualizarStatusOCModal oc={ocStatus} onClose={() => setOcStatus(null)} />
    </div>
  );
}
