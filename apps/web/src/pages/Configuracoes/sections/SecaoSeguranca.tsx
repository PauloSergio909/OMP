import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAlterarSenha } from '../../../hooks/useApi';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

export function SecaoSeguranca() {
  const [form, setForm] = useState({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  const [erro, setErro] = useState('');
  const alterarSenha = useAlterarSenha();

  async function salvar() {
    setErro('');
    if (!form.senhaAtual || !form.novaSenha || !form.confirmarNovaSenha) {
      setErro('Preencha todos os campos');
      return;
    }
    if (form.novaSenha.length < 6) { setErro('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (form.novaSenha !== form.confirmarNovaSenha) { setErro('As senhas não conferem'); return; }
    try {
      await alterarSenha.mutateAsync(form);
      setForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    } catch { /* handled by onError */ }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Alterar Senha</h2>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Senha atual</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
            value={form.senhaAtual}
            onChange={(e) => { setForm({ ...form, senhaAtual: e.target.value }); setErro(''); }}
          />
        </div>
        <div>
          <label className={labelCls}>Nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputCls}
            value={form.novaSenha}
            onChange={(e) => { setForm({ ...form, novaSenha: e.target.value }); setErro(''); }}
          />
        </div>
        <div>
          <label className={labelCls}>Confirmar nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`${inputCls} ${erro ? 'border-red-400' : ''}`}
            value={form.confirmarNovaSenha}
            onChange={(e) => { setForm({ ...form, confirmarNovaSenha: e.target.value }); setErro(''); }}
          />
          {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
        </div>
        <button
          onClick={salvar}
          disabled={alterarSenha.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition mt-2 disabled:opacity-60"
        >
          <Shield size={14} />
          {alterarSenha.isPending ? 'Atualizando...' : 'Atualizar senha'}
        </button>
      </div>
    </div>
  );
}
