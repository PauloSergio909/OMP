import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePageTitle } from '../../hooks/usePageTitle';
import { exportCsv } from '../../utils/exportCsv';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import {
  Package, Plus, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, Search, Edit, Download, TrendingUp,
  ExternalLink, Upload,
} from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { CopyText } from '../../components/ui/CopyText';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { SortableTh } from '../../components/ui/SortableTh';
import {
  useMateriais, useEstoqueKPIs, useCategorias, useFornecedores, useMovimentacoesEstoque,
  type MaterialListItem,
} from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState, useSortState } from '../../hooks/useUrlState';
import { NovaMaterialModal, EditarMaterialModal } from './MateriaisModais';
import { EntradaEstoqueModal, SaidaEstoqueModal } from './MovimentacaoModais';
import { ImportarCSVModal } from './ImportarCSVModal';
import { MovimentacoesRecentes } from './MovimentacoesRecentes';

export function EstoquePage() {
  usePageTitle('Estoque');
  const navigate = useNavigate();
  const [busca, setBusca] = useUrlState('q', '');
  const [catFiltroId, setCatFiltroId] = useUrlState('cat', '');
  const [fornFiltroId, setFornFiltroId] = useUrlState('forn', '');
  const [filtroCritico, setFiltroCritico] = useUrlState('critico', '');
  const [page, setPage] = useUrlPageState();
  const { sortField, sortDir, toggleSort } = useSortState();

  const [modalMaterial, setModalMaterial] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [editandoMat, setEditandoMat] = useState<MaterialListItem | null>(null);
  const [entradaState, setEntradaState] = useState<{ open: boolean; materialId: string; preco: string }>({ open: false, materialId: '', preco: '' });
  const [saidaState, setSaidaState] = useState<{ open: boolean; materialId: string }>({ open: false, materialId: '' });

  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => setModalMaterial(true));
  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCriticoFilter = filtroCritico === '1';
  const { data, isLoading, isError } = useMateriais(page, debouncedBusca, catFiltroId || undefined, 20, isCriticoFilter, fornFiltroId || undefined);
  const { data: kpis }       = useEstoqueKPIs();
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();
  const { data: movData } = useMovimentacoesEstoque(1);

  const materiais: MaterialListItem[] = data?.data ?? [];
  const movimentacoes = movData?.data ?? [];

  const hasFilters = !!(busca || catFiltroId || fornFiltroId || isCriticoFilter);
  function limparFiltros() { setBusca(''); setCatFiltroId(''); setFornFiltroId(''); setFiltroCritico(''); setPage(1); }

  const sortedMateriais = useMemo(() => {
    if (!sortField) return materiais;
    return [...materiais].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === 'codigo')       { va = a.codigo;                         vb = b.codigo; }
      else if (sortField === 'nome')    { va = a.nome;                           vb = b.nome; }
      else if (sortField === 'preco')   { va = a.precoUnitario;                  vb = b.precoUnitario; }
      else if (sortField === 'estoque') { va = a.estoques?.[0]?.quantidade ?? 0; vb = b.estoques?.[0]?.quantidade ?? 0; }
      else { va = ''; vb = ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [materiais, sortField, sortDir]);

  function exportarCSV() {
    exportCsv(
      'estoque',
      ['Código', 'Material', 'Categoria', 'Fornecedor', 'Unidade', 'Preço Unit.', 'Qtd Estoque', 'Localização', 'Mín', 'Máx', 'Status'],
      materiais.map((m) => {
        const qtd = m.estoques?.[0]?.quantidade ?? 0;
        return [m.codigo, m.nome, m.categoria?.nome ?? '', m.fornecedor?.razaoSocial ?? '', m.unidadeMedida, m.precoUnitario.toFixed(2), qtd, m.estoques?.[0]?.localizacao ?? '', m.estoqueMinimo, m.estoqueMaximo, qtd < m.estoqueMinimo ? 'CRÍTICO' : 'NORMAL'];
      }),
    );
    toast.success('CSV exportado com sucesso!');
  }

  return (
    <div className="space-y-6">
      {isError && (
        <ListErrorBanner />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total de Materiais" value={kpis?.totalMateriais ?? '—'} subtitle="itens cadastrados" icon={Package} color="blue" />
        <button className="text-left" onClick={() => { setFiltroCritico(filtroCritico === '1' ? '' : '1'); setPage(1); }}>
          <KPICard title="Abaixo do Mínimo" value={kpis?.itensAbaixoMinimo ?? '—'} subtitle={filtroCritico === '1' ? 'filtro ativo — clique para remover' : 'clique para filtrar'} icon={AlertTriangle} color={(kpis?.itensAbaixoMinimo ?? 0) > 0 ? 'red' : 'green'} />
        </button>
        <KPICard title="Valor em Estoque" value={kpis?.valorEstoque ? `R$ ${(kpis.valorEstoque / 1000).toFixed(1)}k` : '—'} subtitle="custo total estimado" icon={Package} color="purple" />
        <button className="text-left" onClick={() => { setFiltroCritico(filtroCritico === '1' ? '' : '1'); setPage(1); }}>
          <KPICard
            title="Zerados"
            value={kpis?.materiaisCriticos ? kpis.materiaisCriticos.filter((m) => (m.estoques?.[0]?.quantidade ?? 0) === 0).length : '—'}
            subtitle={filtroCritico === '1' ? 'filtro ativo — clique para remover' : 'estoque = 0'}
            icon={AlertTriangle}
            color={kpis?.materiaisCriticos?.some((m) => (m.estoques?.[0]?.quantidade ?? 0) === 0) ? 'red' : 'green'}
          />
        </button>
      </div>

      {/* Saúde do Estoque */}
      {kpis && kpis.totalMateriais > 0 && (() => {
        const criticos  = kpis.itensAbaixoMinimo ?? 0;
        const normais   = kpis.totalMateriais - criticos;
        const pctNormal = Math.round((normais / kpis.totalMateriais) * 100);
        const pctCrit   = 100 - pctNormal;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Saúde do Estoque</h3>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${pctNormal >= 80 ? 'bg-green-50 text-green-700' : pctNormal >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                {pctNormal}% normal
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500 rounded-l-full transition-all duration-500" style={{ width: `${pctNormal}%` }} />
              {pctCrit > 0 && <div className="h-full bg-red-400 rounded-r-full transition-all duration-500" style={{ width: `${pctCrit}%` }} />}
            </div>
            <div className="flex items-center gap-6 mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span>{normais} normal</span></div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span>{criticos} abaixo do mínimo</span></div>
              {kpis.valorEstoque != null && <span className="ml-auto text-xs text-gray-400 font-medium">Valor total: R$ {(kpis.valorEstoque / 1000).toFixed(1)}k</span>}
            </div>
          </div>
        );
      })()}

      {isCriticoFilter && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">Mostrando apenas materiais abaixo do estoque mínimo.</p>
          <button onClick={() => { setFiltroCritico(''); setPage(1); }} className="ml-auto text-xs text-red-600 hover:underline font-medium">Ver todos</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} ref={searchRef} placeholder="Buscar material... (/)" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <select value={catFiltroId} onChange={(e) => { setCatFiltroId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={fornFiltroId} onChange={(e) => { setFornFiltroId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todos os fornecedores</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
          </select>
          <button
            onClick={() => { setFiltroCritico(isCriticoFilter ? '' : '1'); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${isCriticoFilter ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-200 text-red-600 hover:bg-red-50'}`}
          >
            <AlertTriangle size={14} /> Críticos
          </button>
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
        </div>
        <div className="flex gap-2">
          {materiais.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition" title="Exportar CSV">
              <Download size={14} /> CSV
            </button>
          )}
          <button onClick={() => setEntradaState({ open: true, materialId: '', preco: '' })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
            <ArrowDownToLine size={15} /> Entrada
          </button>
          <button onClick={() => setSaidaState({ open: true, materialId: '' })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition">
            <ArrowUpFromLine size={15} /> Saída
          </button>
          <button onClick={() => setModalImport(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            <Upload size={15} /> Importar CSV
          </button>
          <button onClick={() => setModalMaterial(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Novo Material
          </button>
        </div>
      </div>

      {/* Tabela de Materiais */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { label: 'Código',      field: 'codigo' },
                  { label: 'Material',    field: 'nome' },
                  { label: 'Categoria',   field: '' },
                  { label: 'Preço Unit.', field: 'preco' },
                  { label: 'Estoque',     field: 'estoque' },
                  { label: 'Localização', field: '' },
                  { label: 'Nível',       field: '' },
                  { label: 'Status',      field: '' },
                  { label: '',            field: '' },
                ].map(({ label, field }) => (
                  <SortableTh key={label} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : materiais.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={Package}
                      title={isCriticoFilter ? 'Estoque em dia' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum material cadastrado'}
                      description={isCriticoFilter ? 'Nenhum material abaixo do estoque mínimo no momento.' : hasFilters ? 'Nenhum material corresponde aos filtros aplicados.' : 'Cadastre o primeiro item para começar a gerenciar o estoque.'}
                      action={isCriticoFilter
                        ? { label: 'Ver todos os materiais', onClick: () => { setFiltroCritico(''); setPage(1); } }
                        : hasFilters
                          ? { label: 'Limpar filtros', onClick: limparFiltros }
                          : { label: 'Cadastrar Material', onClick: () => setModalMaterial(true), icon: Plus }
                      }
                    />
                  </td>
                </tr>
              ) : sortedMateriais.map((m) => {
                const qtd = m.estoques?.[0]?.quantidade ?? 0;
                const pct = m.estoqueMaximo > 0 ? Math.round((qtd / m.estoqueMaximo) * 100) : 0;
                const isCritico = qtd < m.estoqueMinimo;
                const barColor = isCritico ? 'bg-red-500' : pct < 40 ? 'bg-amber-500' : 'bg-green-500';
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition group cursor-pointer" onClick={() => navigate(`/estoque/${m.id}`)}>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}><CopyText text={m.codigo} className="text-sm font-mono font-semibold text-blue-600" /></td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-900">{m.nome}</div>
                      {m.fornecedor && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/compras?q=${encodeURIComponent(m.fornecedor!.razaoSocial)}`); }} className="text-xs text-gray-400 hover:text-blue-600 transition text-left" title="Ver compras deste fornecedor">
                          {m.fornecedor.razaoSocial}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.categoria ? (
                        <button onClick={(e) => { e.stopPropagation(); setCatFiltroId(m.categoria!.id); setPage(1); }} className="text-sm text-gray-500 hover:text-blue-600 transition text-left" title="Filtrar por esta categoria">
                          {m.categoria.nome}
                        </button>
                      ) : <span className="text-sm text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-700">R$ {m.precoUnitario.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${isCritico ? 'text-red-600' : 'text-gray-900'}`}>{qtd}</span>
                      <span className="text-xs text-gray-400 ml-1">{m.unidadeMedida} (mín: {m.estoqueMinimo})</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {m.estoques?.[0]?.localizacao
                        ? <span className="text-xs font-mono font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{m.estoques[0].localizacao}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {isCritico ? (
                        <button onClick={(e) => { e.stopPropagation(); setFiltroCritico('1'); setPage(1); }} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-red-600/10 hover:opacity-75 transition">
                          <AlertTriangle size={11} /> Crítico
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setFiltroCritico(''); setPage(1); }} className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-green-600/10 hover:opacity-75 transition">Normal</button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEntradaState({ open: true, materialId: m.id, preco: String(m.precoUnitario) }); }} className="p-1.5 rounded-lg hover:bg-green-50 transition text-green-500 opacity-0 group-hover:opacity-100" aria-label="Registrar entrada" title="Entrada rápida"><ArrowDownToLine size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSaidaState({ open: true, materialId: m.id }); }} className="p-1.5 rounded-lg hover:bg-orange-50 transition text-orange-400 opacity-0 group-hover:opacity-100" aria-label="Registrar saída" title="Saída rápida"><ArrowUpFromLine size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditandoMat(m); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 opacity-0 group-hover:opacity-100" aria-label="Editar material"><Edit size={14} /></button>
                        <button onClick={() => navigate(`/estoque/${m.id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100" aria-label="Ver detalhe" title="Ver detalhe"><ExternalLink size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} total={data?.pagination?.total ?? 0} perPage={data?.pagination?.perPage ?? 20} onChange={setPage} />
      </div>

      <MovimentacoesRecentes movimentacoes={movimentacoes} onFiltrarMaterial={(nome) => { setBusca(nome); setPage(1); }} />

      <NovaMaterialModal open={modalMaterial} onClose={() => setModalMaterial(false)} />
      <EditarMaterialModal material={editandoMat} onClose={() => setEditandoMat(null)} />
      <EntradaEstoqueModal open={entradaState.open} onClose={() => setEntradaState({ open: false, materialId: '', preco: '' })} initialMaterialId={entradaState.materialId} initialPreco={entradaState.preco} />
      <SaidaEstoqueModal open={saidaState.open} onClose={() => setSaidaState({ open: false, materialId: '' })} initialMaterialId={saidaState.materialId} />
      <ImportarCSVModal open={modalImport} onClose={() => setModalImport(false)} />
    </div>
  );
}
