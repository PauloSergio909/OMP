import { useState, useEffect } from 'react';
import { ToggleRight, ToggleLeft } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isEmail, combine, isCpf } from '../../hooks/useFormValidation';
import { maskPhone } from '../../utils/applyMask';
import { useAtualizarFuncionario, useToggleAtivoFuncionario, type FuncionarioDetalhe } from '../../hooks/useApi';
import { cargos, cargoLabels, emptyEditForm } from './funcionario.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  funcionario: FuncionarioDetalhe;
}

export function EditarFuncionarioModal({ open, onClose, funcionario }: Props) {
  const [form, setForm] = useState(emptyEditForm);
  const [ativo, setAtivo] = useState(true);

  const atualizar = useAtualizarFuncionario();
  const toggleAtivo = useToggleAtivoFuncionario();

  const { errors, validate, clearAll, validateField, clearError } = useFormValidation<typeof emptyEditForm>({
    nome:         required('Nome'),
    cpf:          combine(required('CPF'), isCpf()),
    telefone:     required('Telefone'),
    email:        combine(required('Email'), isEmail()),
    cnhCategoria: (val, f) => {
      const fTyped = f as typeof emptyEditForm;
      if (fTyped.cargo === 'motorista' && !val) return 'Categoria CNH é obrigatória para motoristas';
      return undefined;
    },
  });

  useEffect(() => {
    if (open) {
      setForm({
        nome:         funcionario.nome,
        cpf:          funcionario.cpf,
        cargo:        funcionario.cargo,
        cnhCategoria: funcionario.cnhCategoria ?? '',
        cnhValidade:  funcionario.cnhValidade ? funcionario.cnhValidade.slice(0, 10) : '',
        telefone:     funcionario.telefone,
        email:        funcionario.email,
      });
      setAtivo(funcionario.ativo ?? true);
      clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!validate(form)) return;
    try {
      const { cpf: _cpf, ...payload } = form;
      await atualizar.mutateAsync({
        id:           funcionario.id,
        ...payload,
        cnhCategoria: payload.cnhCategoria || null,
        cnhValidade:  payload.cnhValidade  || null,
      });
      if (ativo !== funcionario.ativo) {
        await toggleAtivo.mutateAsync({ id: funcionario.id, ativo });
      }
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Funcionário" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome completo" required error={errors.nome}>
          <input className={`${inputCls} ${errors.nome ? 'border-red-400' : ''}`} value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); clearError('nome'); }} onBlur={() => validateField('nome', form)} placeholder="Ex: João da Silva" />
        </Field>
        <Field label="CPF">
          <input className={`${inputCls} bg-gray-100 cursor-not-allowed`} value={form.cpf} readOnly placeholder="000.000.000-00" maxLength={14} />
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
      <div className="mt-4 flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">Situação do funcionário</p>
          <p className="text-xs text-gray-400 mt-0.5">{ativo ? 'Funcionário ativo no sistema' : 'Funcionário inativo — não aparece nas listagens'}</p>
        </div>
        <button type="button" onClick={() => setAtivo((v) => !v)} aria-label={ativo ? 'Desativar funcionário' : 'Ativar funcionário'} className="ml-4 flex-shrink-0">
          {ativo ? <ToggleRight size={28} className="text-blue-600" /> : <ToggleLeft size={28} className="text-gray-300" />}
        </button>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizar.isPending} disabled={!form.nome || !form.telefone || !form.email} confirmLabel="Atualizar" />
    </Modal>
  );
}
