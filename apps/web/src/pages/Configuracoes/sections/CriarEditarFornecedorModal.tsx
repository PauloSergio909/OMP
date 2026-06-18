import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls } from '../../../components/ui/Modal';
import { useCriarFornecedor, useAtualizarFornecedor, type FornecedorListItem } from '../../../hooks/useApi';
import { maskCnpj, maskPhone } from '../../../utils/applyMask';
import { validarCnpj } from '@fleetmaster/shared';
import toast from 'react-hot-toast';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
const emptyForm = { razaoSocial: '', cnpj: '', telefone: '', email: '', endereco: '', avaliacao: 0 };

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = criar; FornecedorListItem = editar */
  editando: FornecedorListItem | null;
}

export function CriarEditarFornecedorModal({ open, onClose, editando }: Props) {
  const [form, setForm] = useState(emptyForm);
  const criarForn = useCriarFornecedor();
  const atualizarForn = useAtualizarFornecedor();

  useEffect(() => {
    if (open) {
      if (editando) {
        setForm({
          razaoSocial: editando.razaoSocial,
          cnpj: maskCnpj(editando.cnpj),
          telefone: maskPhone(editando.telefone),
          email: editando.email,
          endereco: editando.endereco ?? '',
          avaliacao: editando.avaliacao ?? 0,
        });
      } else {
        setForm(emptyForm);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!form.razaoSocial || !form.cnpj || !form.telefone || !form.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (!editando && !validarCnpj(form.cnpj)) { toast.error('CNPJ inválido'); return; }
    if (!isValidEmail(form.email)) { toast.error('E-mail do fornecedor inválido'); return; }
    try {
      if (editando) {
        const { cnpj: _cnpj, ...rest } = form;
        await atualizarForn.mutateAsync({ id: editando.id, ...rest, endereco: form.endereco || null });
      } else {
        await criarForn.mutateAsync({ ...form, endereco: form.endereco || undefined });
      }
      onClose();
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="md">
      <div className="space-y-4">
        <Field label="Razão Social" required>
          <input className={inputCls} value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} placeholder="Ex: Distribuidora XYZ Ltda." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="CNPJ" required={!editando}>
            <input
              className={`${inputCls} ${editando ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              value={form.cnpj}
              onChange={(e) => { if (editando) return; setForm({ ...form, cnpj: maskCnpj(e.target.value) }); }}
              placeholder="00.000.000/0001-00"
              maxLength={18}
              readOnly={!!editando}
              title={editando ? 'CNPJ não pode ser alterado após cadastro' : undefined}
            />
          </Field>
          <Field label="Telefone" required>
            <input className={inputCls} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} />
          </Field>
        </div>
        <Field label="E-mail" required>
          <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@fornecedor.com.br" />
        </Field>
        <Field label="Endereço">
          <input className={inputCls} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, cidade/UF" />
        </Field>
        {editando && (
          <div>
            <p className={labelCls}>Avaliação do fornecedor</p>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, avaliacao: s === form.avaliacao ? 0 : s })}
                  className={`text-2xl transition hover:scale-110 ${s <= (form.avaliacao ?? 0) ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
                  title={`${s} estrela${s !== 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
              {(form.avaliacao ?? 0) > 0 && (
                <span className="ml-2 text-xs text-gray-400">{form.avaliacao}/5 estrelas</span>
              )}
            </div>
          </div>
        )}
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={salvar}
        loading={criarForn.isPending || atualizarForn.isPending}
        disabled={!form.razaoSocial || !form.cnpj || !form.telefone || !form.email}
        confirmLabel={editando ? 'Atualizar' : 'Cadastrar'}
      />
    </Modal>
  );
}
