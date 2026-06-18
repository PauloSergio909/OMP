import { useState } from 'react';
import { Plus, Edit, Search, Users, UserCheck, UserX } from 'lucide-react';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { CopyText } from '../../../components/ui/CopyText';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useUsuarios, useAtualizarUsuario, type UsuarioListItem } from '../../../hooks/useApi';
import toast from 'react-hot-toast';
import { CriarEditarUsuarioModal } from './CriarEditarUsuarioModal';

const roleLabels: Record<string, string> = {
  admin: 'Administrador', gerente: 'Gerente', mecanico: 'Mecânico',
  almoxarife: 'Almoxarife', visualizador: 'Visualizador',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-50 text-red-700', gerente: 'bg-purple-50 text-purple-700',
  mecanico: 'bg-orange-50 text-orange-700', almoxarife: 'bg-blue-50 text-blue-700',
  visualizador: 'bg-gray-50 text-gray-600',
};

export function SecaoUsuarios() {
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const debouncedBusca = useDebouncedValue(busca, 300);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioListItem | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  const { data: userData, isLoading } = useUsuarios(page, debouncedBusca);
  const atualizarUser = useAtualizarUsuario();

  const todos: UsuarioListItem[] = userData?.data ?? [];
  const usuarios = filtroAtivo === 'todos' ? todos
    : todos.filter((u) => filtroAtivo === 'ativo' ? u.ativo : !u.ativo);
  const pagination = userData?.pagination;

  function abrirNovo() { setEditando(null); setModalAberto(true); }
  function abrirEditar(u: UsuarioListItem) { setEditando(u); setModalAberto(true); }

  async function toggleAtivo(u: UsuarioListItem) {
    try {
      await atualizarUser.mutateAsync({ id: u.id, role: u.role, ativo: !u.ativo });
      toast.success(u.ativo ? `${u.nome} desativado` : `${u.nome} ativado`);
    } catch { /* handled by onError */ }
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Usuários do Sistema</h2>
            <p className="text-xs text-gray-400 mt-0.5">Gerencie contas de acesso e permissões</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Novo Usuário
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-72 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['todos', 'ativo', 'inativo'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFiltroAtivo(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  filtroAtivo === v
                    ? v === 'ativo' ? 'bg-green-600 text-white' : v === 'inativo' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v === 'todos' ? 'Todos' : v === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Usuário', 'E-mail', 'Perfil', 'Situação', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <Users size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{u.nome}</p>
                    {u.funcionario && <p className="text-xs text-gray-400">{u.funcionario.cargo}</p>}
                  </td>
                  <td className="px-4 py-3"><CopyText text={u.email} className="text-sm text-gray-500" /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] ?? 'bg-gray-50 text-gray-600'}`}>
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAtivo(u)}
                      disabled={atualizarUser.isPending}
                      title={u.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition hover:opacity-80 disabled:opacity-40 ${
                        u.ativo ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {u.ativo ? <UserCheck size={12} /> : <UserX size={12} />}
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => abrirEditar(u)}
                      aria-label={`Editar usuário ${u.nome}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
                    >
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
            <p className="text-xs text-gray-400">{pagination.total} usuários</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>

      <CriarEditarUsuarioModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        editando={editando}
      />
    </>
  );
}
