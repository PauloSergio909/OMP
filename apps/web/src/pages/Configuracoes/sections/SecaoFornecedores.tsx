import { useState } from 'react';
import { Plus, Edit, Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { CopyText } from '../../../components/ui/CopyText';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useFornecedoresPaginado, type FornecedorListItem } from '../../../hooks/useApi';
import { CriarEditarFornecedorModal } from './CriarEditarFornecedorModal';

export function SecaoFornecedores() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const debouncedBusca = useDebouncedValue(busca, 300);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<FornecedorListItem | null>(null);

  const { data: fornData, isLoading } = useFornecedoresPaginado(page, debouncedBusca);
  const fornecedores: FornecedorListItem[] = fornData?.data ?? [];
  const pagination = fornData?.pagination;

  function abrirNovo() { setEditando(null); setModalAberto(true); }
  function abrirEditar(f: FornecedorListItem) { setEditando(f); setModalAberto(true); }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Fornecedores</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gerencie os fornecedores de materiais e serviços</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Novo Fornecedor
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razão social ou CNPJ..."
            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-72 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Razão Social', 'CNPJ', 'Telefone', 'E-mail', 'Avaliação', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <Truck size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Nenhum fornecedor encontrado</p>
                  </td>
                </tr>
              ) : fornecedores.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/compras?q=${encodeURIComponent(f.razaoSocial)}`)}
                      className="text-sm font-medium text-gray-800 hover:text-blue-600 transition text-left"
                      title="Ver compras deste fornecedor"
                    >
                      {f.razaoSocial}
                    </button>
                    {!f.ativo && <span className="block text-xs text-red-500">Inativo</span>}
                  </td>
                  <td className="px-4 py-3"><CopyText text={f.cnpj} className="text-sm font-mono text-gray-600" /></td>
                  <td className="px-4 py-3"><CopyText text={f.telefone} className="text-sm text-gray-600" /></td>
                  <td className="px-4 py-3"><CopyText text={f.email} className="text-sm text-gray-500" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5" title={`Avaliação: ${f.avaliacao ?? 0}/5`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-sm ${s <= (f.avaliacao ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => abrirEditar(f)} aria-label={`Editar fornecedor ${f.razaoSocial}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                      <Edit size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-gray-400">{pagination.total} fornecedores</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>

      <CriarEditarFornecedorModal open={modalAberto} onClose={() => setModalAberto(false)} editando={editando} />
    </>
  );
}
