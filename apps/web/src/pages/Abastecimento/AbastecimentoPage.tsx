import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { exportCsv } from '../../utils/exportCsv';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { useUrlState, useUrlPageState, useSortState } from '../../hooks/useUrlState';
import { RelDate } from '../../components/ui/RelDate';
import { Fuel, Plus, Truck, User, TrendingUp, DollarSign, Filter, Search, Download, Edit2, Trash2, Droplets, Gauge } from 'lucide-react';
import { SortableTh } from '../../components/ui/SortableTh';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { KPICard } from '../../components/ui/KPICard';
import { CopyText } from '../../components/ui/CopyText';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  useAbastecimentos, useAbastecimentosKPIs, useRemoverAbastecimento,
  useCaminhoes, useFuncionarios, useHistoricoAbastecimento, useRankingEficiencia,
  type AbastecimentoListItem,
} from '../../hooks/useApi';
import { RegistrarAbastecimentoModal } from './RegistrarAbastecimentoModal';
import { EditarAbastecimentoModal } from './EditarAbastecimentoModal';

export function AbastecimentoPage() {
  const navigate = useNavigate();
  usePageTitle('Abastecimento');
  const [page, setPage] = useUrlPageState();
  const [filtroCaminhao, setFiltroCaminhao] = useUrlState('caminhao', '');
  const [filtroMotorista, setFiltroMotorista] = useUrlState('motorista', '');
  const [filtroDataDe, setFiltroDataDe] = useUrlState('de', '');
  const [filtroDataAte, setFiltroDataAte] = useUrlState('ate', '');
  const [filtroCombustivel, setFiltroCombustivel] = useUrlState('comb', '');
  const [busca, setBusca] = useUrlState('q', '');
  const { sortField, sortDir, toggleSort } = useSortState();
  const [modalNovo, setModalNovo] = useState(false);
  const [abEditar, setAbEditar] = useState<AbastecimentoListItem | null>(null);
  const [confirmRemover, setConfirmRemover] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => setModalNovo(true));
  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError } = useAbastecimentos(page, filtroCaminhao || undefined, filtroDataDe || undefined, filtroDataAte || undefined, debouncedBusca || undefined, filtroCombustivel || undefined, filtroMotorista || undefined);
  const { data: kpis } = useAbastecimentosKPIs(filtroCaminhao || undefined);
  const { data: historico } = useHistoricoAbastecimento(6, filtroCaminhao || undefined);
  const { data: rankingEficiencia = [] } = useRankingEficiencia();
  const { data: caminhoesList } = useCaminhoes(1, undefined, undefined, 200);
  const { data: funcList } = useFuncionarios(1, '', 'motorista', undefined, 200);
  const remover = useRemoverAbastecimento();

  const abastecimentos: AbastecimentoListItem[] = data?.data ?? [];
  const caminhoes = caminhoesList?.data ?? [];
  const motoristas = funcList?.data ?? [];

  const mediaKmLFrota = useMemo(() => {
    const valid = rankingEficiencia.filter((r) => r.mediaKmL !== null);
    if (valid.length === 0) return null;
    return +(valid.reduce((s, r) => s + r.mediaKmL!, 0) / valid.length).toFixed(2);
  }, [rankingEficiencia]);

  const hasFilters = !!(busca || filtroCaminhao || filtroMotorista || filtroDataDe || filtroDataAte || filtroCombustivel);
  function limparFiltros() { setBusca(''); setFiltroCaminhao(''); setFiltroMotorista(''); setFiltroDataDe(''); setFiltroDataAte(''); setFiltroCombustivel(''); setPage(1); }

  const sortedAbastecimentos = useMemo(() => {
    if (!sortField) return abastecimentos;
    return [...abastecimentos].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === 'data')       { va = new Date(a.data).getTime();    vb = new Date(b.data).getTime(); }
      else if (sortField === 'caminhao') { va = a.caminhao?.codigo ?? '';   vb = b.caminhao?.codigo ?? ''; }
      else if (sortField === 'litros')   { va = a.litros;                   vb = b.litros; }
      else if (sortField === 'total')    { va = a.litros * a.precoLitro;    vb = b.litros * b.precoLitro; }
      else if (sortField === 'km')       { va = a.kmAtual;                  vb = b.kmAtual; }
      else { va = ''; vb = ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [abastecimentos, sortField, sortDir]);

  // km/L client-side: pega o abastecimento anterior do mesmo caminhão no array DESC
  const kmLPorId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (let i = 0; i < abastecimentos.length; i++) {
      const ab = abastecimentos[i];
      const anterior = abastecimentos.slice(i + 1).find((x) => x.caminhao?.id === ab.caminhao?.id);
      if (anterior && ab.kmAtual > anterior.kmAtual) {
        map.set(ab.id, Math.round((ab.kmAtual - anterior.kmAtual) / ab.litros * 100) / 100);
      } else {
        map.set(ab.id, null);
      }
    }
    return map;
  }, [abastecimentos]);

  async function executarRemover(id: string) {
    try {
      await remover.mutateAsync(id);
      setConfirmRemover(null);
    } catch { /* handled by onError in hook */ }
  }

  function exportarCSV() {
    exportCsv(
      'abastecimentos',
      ['Data', 'Caminhão', 'Placa', 'Motorista', 'Combustível', 'Litros', 'Preço/L', 'Total (R$)', 'KM', 'km/L', 'Posto'],
      abastecimentos.map((ab) => [
        new Date(ab.data).toLocaleDateString('pt-BR'),
        ab.caminhao?.codigo ?? '', ab.caminhao?.placa ?? '',
        ab.motorista?.nome ?? '',
        ab.combustivel?.replace('_', ' ') ?? '',
        ab.litros.toFixed(1), ab.precoLitro.toFixed(3),
        (ab.litros * ab.precoLitro).toFixed(2),
        ab.kmAtual, kmLPorId.get(ab.id) ?? '', ab.posto ?? '',
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
        <KPICard title="Abastecimentos (mês)" value={kpis?.abastecimentosMes ?? '—'} subtitle="registros no mês" icon={Fuel} color="blue" />
        <KPICard title="Litros (mês)" value={kpis?.litrosMes ? `${kpis.litrosMes.toFixed(0)} L` : '—'} subtitle="consumo total" icon={TrendingUp} color="green" />
        <KPICard title="Custo (mês)" value={kpis ? `R$ ${(kpis.custoMes ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'} subtitle="combustível" icon={DollarSign} color="orange" />
        <KPICard title="Preço médio" value={kpis?.precoMedioLitro ? `R$ ${kpis.precoMedioLitro.toFixed(3)}/L` : '—'} subtitle="diesel no período" icon={Fuel} color="purple" />
        <KPICard title="Eficiência média" value={mediaKmLFrota != null ? `${mediaKmLFrota} km/L` : '—'} subtitle="média da frota (histórico)" icon={Gauge} color="blue" />
      </div>

      {(historico ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900">Consumo Mensal — últimos 6 meses</h3>
            {filtroCaminhao && (
              <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                {caminhoes.find((c) => c.id === filtroCaminhao)?.codigo ?? 'Filtrado'}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={historico} margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="litros" orientation="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k L`} width={44} />
              <YAxis yAxisId="custo" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
              <Tooltip formatter={(value: number, name: string) => name === 'litros' ? [`${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`, 'Litros'] : [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend formatter={(v) => v === 'litros' ? 'Litros' : 'Custo (R$)'} wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="litros" dataKey="litros" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="custo" dataKey="custo" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" ref={searchRef} placeholder="Posto, placa ou motorista... (/)" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} className="pl-7 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-48" />
          </div>
          <select value={filtroCaminhao} onChange={(e) => { setFiltroCaminhao(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todos os caminhões</option>
            {caminhoes.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.modelo}</option>)}
          </select>
          <select value={filtroMotorista} onChange={(e) => { setFiltroMotorista(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todos os motoristas</option>
            {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <select value={filtroCombustivel} onChange={(e) => { setFiltroCombustivel(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todos os combustíveis</option>
            <option value="diesel">Diesel</option>
            <option value="diesel_s10">Diesel S10</option>
            <option value="arla32">Arla 32</option>
          </select>
          <input type="date" value={filtroDataDe} onChange={(e) => { setFiltroDataDe(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" title="Data inicial" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={filtroDataAte} onChange={(e) => { setFiltroDataAte(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none" title="Data final" />
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
        </div>
        <div className="flex items-center gap-2">
          {abastecimentos.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" title="Exportar página atual como CSV">
              <Download size={15} /> CSV
            </button>
          )}
          <button onClick={() => setModalNovo(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Registrar Abastecimento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { label: 'Data',        field: 'data' },
                  { label: 'Caminhão',    field: 'caminhao' },
                  { label: 'Motorista',   field: '' },
                  { label: 'Combustível', field: '' },
                  { label: 'Litros',      field: 'litros' },
                  { label: 'Preço/L',     field: '' },
                  { label: 'Total',       field: 'total' },
                  { label: 'KM',          field: 'km' },
                  { label: 'km/L',        field: '' },
                  { label: 'Posto',       field: '' },
                  { label: '',            field: '' },
                ].map(({ label, field }) => (
                  <SortableTh key={label} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={toggleSort} px="px-4" />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={5} cols={10} />
              ) : abastecimentos.length === 0 ? (
                <tr><td colSpan={10}>
                  <EmptyState
                    icon={Droplets}
                    title={hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum abastecimento registrado'}
                    description={hasFilters ? 'Nenhum abastecimento corresponde aos filtros aplicados.' : 'Registre o primeiro abastecimento para começar a acompanhar o consumo.'}
                    action={hasFilters ? { label: 'Limpar filtros', onClick: limparFiltros } : { label: 'Registrar Abastecimento', onClick: () => setModalNovo(true), icon: Plus }}
                  />
                </td></tr>
              ) : sortedAbastecimentos.map((ab) => (
                <tr key={ab.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => ab.caminhao?.id && navigate(`/frota/${ab.caminhao.id}`)}>
                  <td className="px-4 py-3 text-sm text-gray-600"><RelDate date={ab.data} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                      <Truck size={13} className="text-gray-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1">
                          {ab.caminhao?.id ? (
                            <button onClick={(e) => { e.stopPropagation(); setFiltroCaminhao(ab.caminhao!.id); setPage(1); }} className="font-medium text-gray-800 hover:text-blue-600 transition text-left" title="Filtrar abastecimentos deste veículo">
                              {ab.caminhao.codigo}
                            </button>
                          ) : '—'}
                          <span className="text-gray-400 font-normal text-xs">• {ab.caminhao?.modelo}</span>
                        </div>
                        {ab.caminhao?.placa && <CopyText text={ab.caminhao.placa} className="text-xs text-gray-400 font-mono" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <User size={13} className="text-gray-400" />
                      {ab.motorista ? (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${ab.motorista!.id}`); }} className="hover:text-blue-600 transition text-left" title="Ver perfil do motorista">
                          {ab.motorista.nome}
                        </button>
                      ) : <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); setFiltroCombustivel(ab.combustivel ?? ''); setPage(1); }} className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full hover:opacity-75 transition" title={`Filtrar por ${ab.combustivel?.replace('_', ' ')}`}>
                      {ab.combustivel?.replace('_', ' ')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{ab.litros.toFixed(1)} L</td>
                  <td className="px-4 py-3 text-sm text-gray-600">R$ {ab.precoLitro.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">R$ {(ab.litros * ab.precoLitro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ab.kmAtual.toLocaleString('pt-BR')} km</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const kml = kmLPorId.get(ab.id) ?? null;
                      if (kml === null) return <span className="text-xs text-gray-300">—</span>;
                      const cor = kml >= 4 ? 'text-green-600' : kml >= 3 ? 'text-amber-600' : 'text-red-500';
                      return <span className={`text-sm font-semibold ${cor}`}>{kml.toFixed(2)}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {ab.posto ? (
                      <button onClick={(e) => { e.stopPropagation(); setBusca(ab.posto ?? ''); setPage(1); }} className="text-sm text-gray-500 hover:text-blue-600 hover:underline transition text-left" title={`Filtrar por ${ab.posto}`}>
                        {ab.posto}
                      </button>
                    ) : <span className="text-sm text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setAbEditar(ab); }} className="p-1.5 text-gray-400 hover:text-blue-500 transition rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100" aria-label="Editar abastecimento">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmRemover(ab.id); }} className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100" aria-label="Remover abastecimento">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} total={data?.pagination?.total ?? 0} perPage={data?.pagination?.perPage ?? 20} onChange={setPage} />
      </div>

      <RegistrarAbastecimentoModal open={modalNovo} onClose={() => setModalNovo(false)} />
      <EditarAbastecimentoModal abastecimento={abEditar} onClose={() => setAbEditar(null)} />
      <ConfirmModal
        open={confirmRemover !== null}
        onClose={() => setConfirmRemover(null)}
        onConfirm={() => confirmRemover && executarRemover(confirmRemover)}
        title="Remover abastecimento"
        message="Tem certeza que deseja remover este registro? Esta ação não pode ser desfeita."
        variant="danger"
        loading={remover.isPending}
      />
    </div>
  );
}
