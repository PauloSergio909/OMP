import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import toast from 'react-hot-toast';
import { exportCsv } from '../../utils/exportCsv';
import { RelDate } from '../../components/ui/RelDate';
import { useSearchShortcut } from '../../hooks/useSearchShortcut';
import { useNewShortcut } from '../../hooks/useNewShortcut';
import { Users, Plus, Search, Phone, Mail, Edit, UserX, ExternalLink, AlertTriangle, Car, Wrench, Download } from 'lucide-react';
import { SortableTh } from '../../components/ui/SortableTh';
import { KPICard } from '../../components/ui/KPICard';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { ListErrorBanner } from '../../components/ui/ErrorBoundary';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useFuncionarios, useFuncionariosKPIs, useCnhVencendo, type FuncionarioListItem } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useUrlState, useUrlPageState, useSortState } from '../../hooks/useUrlState';
import { cargoLabels, cargoIcons, cargos, cnhAlert } from './funcionarios.constants';
import { BannerCnhVencendo } from './BannerCnhVencendo';
import { CriarEditarFuncionarioModal } from './CriarEditarFuncionarioModal';

export function FuncionariosPage() {
  const navigate = useNavigate();
  usePageTitle('Funcionários');
  const [busca, setBusca] = useUrlState('q', '');
  const [cargoFiltro, setCargoFiltro] = useUrlState('cargo', '');
  const [mostrarInativos, setMostrarInativos] = useUrlState('inativos', '');
  const [filtroCnh, setFiltroCnh] = useUrlState('cnh', '');
  const { sortField, sortDir, toggleSort } = useSortState();
  const [page, setPage] = useUrlPageState();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<FuncionarioListItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(searchRef, () => setBusca(''));
  useNewShortcut(() => { setEditando(null); setModalAberto(true); });
  const debouncedBusca = useDebouncedValue(busca, 300);
  useEffect(() => { setPage(1); }, [debouncedBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInativos = mostrarInativos === '1';
  const { data, isLoading, isError } = useFuncionarios(page, debouncedBusca, filtroCnh === '1' ? undefined : (cargoFiltro || undefined), isInativos ? false : true, 20, filtroCnh === '1' ? true : undefined);
  const { data: kpis } = useFuncionariosKPIs();
  const { data: cnhAlertas = [] } = useCnhVencendo();
  const funcionarios: FuncionarioListItem[] = data?.data ?? [];

  const hasFilters = !!(busca || cargoFiltro || isInativos || filtroCnh);
  function limparFiltros() { setBusca(''); setCargoFiltro(''); setMostrarInativos(''); setFiltroCnh(''); setPage(1); }


  const sortedFuncionarios = useMemo(() => {
    if (!sortField) return funcionarios;
    return [...funcionarios].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortField === 'nome')      { va = a.nome;           vb = b.nome; }
      else if (sortField === 'cargo')     { va = a.cargo;          vb = b.cargo; }
      else if (sortField === 'validade')  { va = a.cnhValidade ? new Date(a.cnhValidade).getTime() : 0; vb = b.cnhValidade ? new Date(b.cnhValidade).getTime() : 0; }
      else if (sortField === 'status')    { va = a.ativo ? 1 : 0;  vb = b.ativo ? 1 : 0; }
      else { va = ''; vb = ''; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [funcionarios, sortField, sortDir]);

  function exportarCSV() {
    exportCsv(
      'funcionarios',
      ['Nome', 'CPF', 'Cargo', 'CNH Categoria', 'Validade CNH', 'Telefone', 'Email', 'Status'],
      funcionarios.map((f) => [
        f.nome, f.cpf, cargoLabels[f.cargo] ?? f.cargo,
        f.cnhCategoria ?? '',
        f.cnhValidade ? new Date(f.cnhValidade).toLocaleDateString('pt-BR') : '',
        f.telefone, f.email ?? '', f.ativo ? 'Ativo' : 'Inativo',
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
        <KPICard title="Total" value={kpis?.total ?? '—'} subtitle="funcionários cadastrados" icon={Users} color="blue" />
        <button className="text-left" onClick={() => { setCargoFiltro('motorista'); setFiltroCnh(''); setMostrarInativos(''); setPage(1); }} title="Filtrar por motoristas">
          <KPICard title="Motoristas" value={kpis?.motoristas ?? '—'} subtitle="ativos — clique para filtrar" icon={Car} color="green" />
        </button>
        <button className="text-left" onClick={() => { setCargoFiltro('mecanico'); setFiltroCnh(''); setMostrarInativos(''); setPage(1); }} title="Filtrar por mecânicos">
          <KPICard title="Mecânicos" value={kpis?.mecanicos ?? '—'} subtitle="ativos — clique para filtrar" icon={Wrench} color="orange" />
        </button>
        <button className="text-left" onClick={() => { setFiltroCnh(filtroCnh === '1' ? '' : '1'); setCargoFiltro(''); setMostrarInativos(''); setPage(1); }}>
          <KPICard title="CNH Vencendo" value={kpis?.cnhVencendo ?? '—'} subtitle={filtroCnh === '1' ? 'filtro ativo — clique para remover' : 'próximos 30 dias — clique para filtrar'} icon={AlertTriangle} color={(kpis?.cnhVencendo ?? 0) > 0 ? 'red' : 'green'} />
        </button>
      </div>

      <BannerCnhVencendo
        alertas={cnhAlertas}
        filtroCnhAtivo={filtroCnh === '1'}
        onToggleFiltro={() => { setFiltroCnh(filtroCnh === '1' ? '' : '1'); setCargoFiltro(''); setMostrarInativos(''); setPage(1); }}
      />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} ref={searchRef} placeholder="Buscar funcionário... (/)" className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <select value={cargoFiltro} onChange={(e) => { setCargoFiltro(e.target.value); setFiltroCnh(''); setPage(1); }} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none">
            <option value="">Todos os cargos</option>
            {cargos.map((c) => <option key={c} value={c}>{cargoLabels[c]}</option>)}
          </select>
          <button onClick={() => { setMostrarInativos(isInativos ? '' : '1'); setPage(1); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${isInativos ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
            <UserX size={14} /> {isInativos ? 'Mostrando inativos' : 'Ver inativos'}
          </button>
          {filtroCnh === '1' && (
            <button onClick={() => setFiltroCnh('')} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
              CNH Vencendo <span className="ml-0.5 font-bold">×</span>
            </button>
          )}
          {hasFilters && <button onClick={limparFiltros} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>}
        </div>
        <div className="flex items-center gap-2">
          {funcionarios.length > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" title="Exportar página atual como CSV">
              <Download size={15} /> CSV
            </button>
          )}
          <button onClick={() => { setEditando(null); setModalAberto(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={15} /> Novo Funcionário
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { label: 'Funcionário', field: 'nome' },
                  { label: 'Cargo',       field: 'cargo' },
                  { label: 'CNH',         field: '' },
                  { label: 'Validade CNH', field: 'validade' },
                  { label: 'Telefone',    field: '' },
                  { label: 'Email',       field: '' },
                  { label: 'Status',      field: 'status' },
                  { label: '',            field: '' },
                ].map(({ label, field }) => (
                  <SortableTh key={label} label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={5} cols={8} />
              ) : funcionarios.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={Users}
                    title={filtroCnh === '1' ? 'Nenhum funcionário com CNH vencendo' : hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum funcionário cadastrado'}
                    description={filtroCnh === '1' ? 'Todas as CNH estão válidas por mais de 30 dias.' : hasFilters ? 'Nenhum funcionário corresponde aos filtros aplicados.' : 'Cadastre o primeiro colaborador da equipe.'}
                    action={filtroCnh === '1' ? { label: 'Remover filtro', onClick: () => setFiltroCnh('') } : hasFilters ? { label: 'Limpar filtros', onClick: limparFiltros } : { label: 'Cadastrar Funcionário', onClick: () => setModalAberto(true), icon: Plus }}
                  />
                </td></tr>
              ) : sortedFuncionarios.map((f) => {
                const Icon = cargoIcons[f.cargo] ?? Users;
                const alerta = cnhAlert(f.cnhValidade);
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/funcionarios/${f.id}`)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Icon size={16} className="text-blue-600" /></div>
                        <div><p className="text-sm font-semibold text-gray-900">{f.nome}</p><CopyText text={f.cpf} className="text-xs text-gray-400" /></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={(e) => { e.stopPropagation(); setCargoFiltro(f.cargo); setFiltroCnh(''); setPage(1); }} className="hover:opacity-75 transition text-left" title={`Filtrar por ${cargoLabels[f.cargo] ?? f.cargo}`}>
                        <StatusBadge status={f.cargo} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {f.cnhCategoria ? <span className="font-medium">{f.cnhCategoria}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {f.cnhValidade ? (
                        <div className="flex items-center gap-1.5">
                          <RelDate date={f.cnhValidade!} className={`text-sm ${alerta === 'vencida' ? 'text-red-600 font-medium' : alerta === 'vencendo' ? 'text-amber-600 font-medium' : 'text-gray-600'}`} />
                          {alerta && <AlertTriangle size={12} className={alerta === 'vencida' ? 'text-red-500' : 'text-amber-500'} />}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone size={13} className="text-gray-400" />
                        <CopyText text={f.telefone} className="text-sm text-gray-600" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Mail size={13} className="text-gray-400" />
                        <CopyText text={f.email} className="text-sm text-gray-500" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={(e) => { e.stopPropagation(); setMostrarInativos(f.ativo ? '' : '1'); setPage(1); }} className="hover:opacity-75 transition" title={f.ativo ? 'Mostrar apenas ativos' : 'Mostrar funcionários inativos'}>
                        <StatusBadge status={f.ativo ? 'ativo' : 'inativo'} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditando(f); setModalAberto(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 opacity-0 group-hover:opacity-100" aria-label="Editar funcionário"><Edit size={15} /></button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${f.id}`); }} className="p-1.5 rounded-lg hover:bg-blue-50 transition text-blue-400 opacity-0 group-hover:opacity-100" aria-label="Ver detalhes do funcionário"><ExternalLink size={15} /></button>
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

      <CriarEditarFuncionarioModal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null); }}
        editando={editando}
      />
    </div>
  );
}
