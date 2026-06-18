import { useState, useEffect } from 'react';
import { ToggleRight, ToggleLeft } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isEmail, combine, isCpf } from '../../hooks/useFormValidation';
import { maskCpf, maskPhone } from '../../utils/applyMask';
import { useCriarFuncionario, useAtualizarFuncionario, useToggleAtivoFuncionario, type FuncionarioListItem } from '../../hooks/useApi';
import { cargos, cargoLabels, emptyFuncionarioForm } from './funcionarios.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  editando: FuncionarioListItem | null;
}

export function CriarEditarFuncionarioModal({ open, onClose, editando }: Props) {
  const [form, setForm] = useState(emptyFuncionarioForm);
  const [ativo, setAtivo] = useState(true);

  const criar = useCriarFuncionario();
  const atualizar = useAtualizarFuncionario();
  const toggleAtivo = useToggleAtivoFuncionario();
  const salvando = criar.isPending || atualizar.isPending || toggleAtivo.isPending;

  const { errors, validate, clearAll, validateField, clearError } = useFormValidation<typeof emptyFuncionarioForm>({
    nome:         required('Nome'),
    cpf:          combine(required('CPF'), isCpf()),
    telefone:     required('Telefone'),
    email:        combine(required('Email'), isEmail()),
    cnhCategoria: (val, f) => {
      const fTyped = f as typeof emptyFuncionarioForm;
      if (fTyped.cargo === 'motorista' && !val) return 'Categoria CNH é obrigatória para motoristas';
      return undefined;
    },
  });

  useEffect(() => {
    if (open) {
      if (editando) {
        setForm({
          nome: editando.nome, cpf: maskCpf(editando.cpf), cargo: editando.cargo,
          cnhCategoria: editando.cnhCategoria ?? '',
          cnhValidade:  editando.cnhValidade ? editando.cnhValidade.slice(0, 10) : '',
          telefone: maskPhone(editando.telefone), email: editando.email,
        });
        setAtivo(editando.ativo ?? true);
      } else {
        setForm(emptyFuncionarioForm);
        setAtivo(true);
      }
      clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!validate(form)) return;
    try {
      if (editando) {
        const { cpf: _cpf, ...payload } = {
          ...form,
          cnhCategoria: form.cnhCategoria || null,
          cnhValidade:  form.cnhValidade  || null,
        };
        await atualizar.mutateAsync({ id: editando.id, ...payload });
        if (ativo !== editando.ativo) {
          await toggleAtivo.mutateAsync({ id: editando.id, ativo });
        }
      } else {
        await criar.mutateAsync({
          ...form,
          cnhCategoria: form.cnhCategoria || undefined,
          cnhValidade:  form.cnhValidade  || undefined,
        });
      }
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Funcionário' : 'Novo Funcionário'} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome completo" required error={errors.nome}>
          <input className={`${inputCls} ${errors.nome ? 'border-red-400' : ''}`} value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); clearError('nome'); }} onBlur={() => validateField('nome', form)} placeholder="Ex: João da Silva" />
        </Field>
        <Field label="CPF" required error={errors.cpf}>
          <input
            className={`${inputCls} ${errors.cpf ? 'border-red-400' : ''} ${editando ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={form.cpf}
            onChange={(e) => { if (editando) return; setForm({ ...form, cpf: maskCpf(e.target.value) }); clearError('cpf'); }}
            onBlur={() => { if (!editando) validateField('cpf', form); }}
            placeholder="000.000.000-00"
            maxLength={14}
            readOnly={!!editando}
            title={editando ? 'CPF não pode ser alterado após cadastro' : undefined}
          />
        </Field>
        <Field label="Cargo" required>
          <select className={selectCls} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
            {cargos.map((c) => <option key={c} value={c}>{cargoLabels[c]}</option>)}
          </select>
        </Field>
        {form.cargo === 'motorista' && (
          <>
            <Field label="Categoria CNH" required error={errors.cnhCategoria}>
              <select className={`${selectCls} ${errors.cnhCategoria ? 'border-red-400' : ''}`} value={form.cnhCategoria} onChange={(e) => { setForm({ ...form, cnhCategoria: e.target.value }); clearError('cnhCategoria'); }}>
                <option value="">Selecione</option>
                {['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Validade CNH">
              <input className={inputCls} type="date" value={form.cnhValidade} onChange={(e) => setForm({ ...form, cnhValidade: e.target.value })} />
            </Field>
          </>
        )}
        <Field label="Telefone" required error={errors.telefone}>
          <input className={`${inputCls} ${errors.telefone ? 'border-red-400' : ''}`} value={form.telefone} onChange={(e) => { setForm({ ...form, telefone: maskPhone(e.target.value) }); clearError('telefone'); }} onBlur={() => validateField('telefone', form)} placeholder="(00) 00000-0000" maxLength={15} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input className={`${inputCls} ${errors.email ? 'border-red-400' : ''}`} type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError('email'); }} onBlur={() => validateField('email', form)} placeholder="email@exemplo.com" />
        </Field>
      </div>
      {editando && (
        <div className="mt-4 flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Situação do funcionário</p>
            <p className="text-xs text-gray-400 mt-0.5">{ativo ? 'Funcionário ativo no sistema' : 'Funcionário inativo — não aparece nas listagens'}</p>
          </div>
          <button type="button" onClick={() => setAtivo((v) => !v)} aria-label={ativo ? 'Desativar funcionário' : 'Ativar funcionário'} className="ml-4 flex-shrink-0">
            {ativo ? <ToggleRight size={28} className="text-blue-600" /> : <ToggleLeft size={28} className="text-gray-300" />}
          </button>
        </div>
      )}
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={salvando} disabled={!form.nome || !form.telefone || !form.email || (!editando && !form.cpf)} confirmLabel={editando ? 'Atualizar' : 'Cadastrar'} />
    </Modal>
  );
}
