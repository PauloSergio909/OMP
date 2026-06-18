import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useGetEmpresa, useUpdateEmpresa } from '../../../hooks/useApi';
import { maskCnpj, maskPhone } from '../../../utils/applyMask';
import { validarCnpj } from '@fleetmaster/shared';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

export function SecaoEmpresa() {
  const { data: empresaData, isLoading } = useGetEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const [form, setForm] = useState({ razaoSocial: '', cnpj: '', telefone: '', email: '', endereco: '', logoUrl: '' });

  useEffect(() => {
    if (empresaData) {
      setForm({
        razaoSocial: empresaData.razaoSocial,
        cnpj: maskCnpj(empresaData.cnpj ?? ''),
        telefone: maskPhone(empresaData.telefone ?? ''),
        email: empresaData.email ?? '',
        endereco: empresaData.endereco ?? '',
        logoUrl: empresaData.logoUrl ?? '',
      });
    }
  }, [empresaData]);

  async function salvar() {
    if (!form.razaoSocial.trim()) { toast.error('Razão social é obrigatória'); return; }
    if (form.cnpj && !validarCnpj(form.cnpj)) { toast.error('CNPJ inválido'); return; }
    try {
      await updateEmpresa.mutateAsync({
        razaoSocial: form.razaoSocial,
        cnpj: form.cnpj || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        endereco: form.endereco || undefined,
        logoUrl: form.logoUrl || undefined,
      });
    } catch { /* handled by onError */ }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Dados da Empresa</h2>
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Razão social *</label>
            <input className={inputCls} value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>CNPJ</label>
              <input
                className={inputCls}
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                placeholder="00.000.000/0001-00"
                maxLength={18}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                className={inputCls}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
                placeholder="(11) 90000-0000"
                maxLength={15}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com.br" />
          </div>
          <div>
            <label className={labelCls}>Endereço</label>
            <input className={inputCls} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, cidade/UF" />
          </div>
          <div>
            <label className={labelCls}>URL do logotipo</label>
            <input className={inputCls} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
          </div>
          <button
            onClick={salvar}
            disabled={updateEmpresa.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition mt-2 disabled:opacity-60"
          >
            <Save size={14} />
            {updateEmpresa.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  );
}
