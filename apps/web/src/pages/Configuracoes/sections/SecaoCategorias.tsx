import { useState } from 'react';
import { Plus, Edit, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { Modal, Field, ModalFooter, inputCls } from '../../../components/ui/Modal';
import { useCategorias, useCriarCategoria, useAtualizarCategoria, type CategoriaItem } from '../../../hooks/useApi';
import toast from 'react-hot-toast';

export function SecaoCategorias() {
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });

  const { data: categorias = [], isLoading } = useCategorias();
  const criarCat = useCriarCategoria();
  const atualizarCat = useAtualizarCategoria();

  function abrirNovo() { setForm({ nome: '', descricao: '' }); setEditandoId(null); setModalAberto(true); }
  function abrirEditar(c: CategoriaItem) {
    setForm({ nome: c.nome, descricao: c.descricao ?? '' });
    setEditandoId(c.id);
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome) { toast.error('Informe o nome da categoria'); return; }
    try {
      if (editandoId) {
        await atualizarCat.mutateAsync({ id: editandoId, ...form, descricao: form.descricao || null });
      } else {
        await criarCat.mutateAsync({ ...form, descricao: form.descricao || undefined });
      }
      setModalAberto(false);
    } catch { /* handled by onError */ }
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Categorias de Materiais</h2>
            <p className="text-xs text-gray-400 mt-0.5">Organize os materiais do estoque por categoria</p>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Nova Categoria
          </button>
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Nome', 'Descrição', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <TableSkeleton rows={3} cols={3} />
              ) : categorias.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center">
                    <Package size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Nenhuma categoria cadastrada</p>
                  </td>
                </tr>
              ) : categorias.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/estoque?cat=${c.id}`)}
                      className="text-sm font-medium text-gray-800 hover:text-blue-600 transition text-left"
                      title="Ver materiais desta categoria"
                    >
                      {c.nome}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {c.descricao ?? <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => abrirEditar(c)}
                      aria-label={`Editar categoria ${c.nome}`}
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
      </div>

      {/* Modal Categoria */}
      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <div className="space-y-4">
          <Field label="Nome da categoria" required>
            <input className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Lubrificantes, Filtros, Elétrico..." />
          </Field>
          <Field label="Descrição">
            <input className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional" />
          </Field>
        </div>
        <ModalFooter
          onCancel={() => setModalAberto(false)}
          onConfirm={salvar}
          loading={criarCat.isPending || atualizarCat.isPending}
          disabled={!form.nome}
          confirmLabel={editandoId ? 'Atualizar' : 'Criar'}
        />
      </Modal>
    </>
  );
}
