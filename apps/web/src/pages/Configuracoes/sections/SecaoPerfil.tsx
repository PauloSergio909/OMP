import { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth.store';
import { useAtualizarPerfil } from '../../../hooks/useApi';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function SecaoPerfil() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ nome: user?.nome ?? '', email: user?.email ?? '' });
  const atualizarPerfil = useAtualizarPerfil();

  async function salvar() {
    if (!form.nome.trim() || !form.email.trim()) { toast.error('Preencha nome e e-mail'); return; }
    if (!isValidEmail(form.email)) { toast.error('E-mail inválido'); return; }
    try {
      const updated = await atualizarPerfil.mutateAsync(form);
      updateUser({ nome: updated.nome, email: updated.email });
    } catch { /* handled by onError */ }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Dados do Perfil</h2>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Nome completo</label>
          <input
            className={inputCls}
            autoComplete="name"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>E-mail</label>
          <input
            className={inputCls}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Perfil de acesso</label>
          <input
            value={user?.role ?? ''}
            readOnly
            className="w-full px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>
        <button
          onClick={salvar}
          disabled={atualizarPerfil.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition mt-2 disabled:opacity-60"
        >
          <Save size={14} />
          {atualizarPerfil.isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
