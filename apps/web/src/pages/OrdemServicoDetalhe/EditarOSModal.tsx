import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useAtualizarOS, useFuncionarios, type OrdemServicoDetalhe } from '../../hooks/useApi';

interface Props {
  open: boolean;
  onClose: () => void;
  os: OrdemServicoDetalhe;
}

export function EditarOSModal({ open, onClose, os }: Props) {
  const [form, setForm] = useState({ descricao: '', prioridade: '', responsavelId: '', dataPrevisao: '', observacoes: '' });
  const atualizarOS = useAtualizarOS();
  const { data: funcList } = useFuncionarios(1, '', undefined, undefined, 200);
  const mecanicos = funcList?.data ?? [];

  useEffect(() => {
    if (open) {
      setForm({
        descricao:     os.descricao ?? '',
        prioridade:    os.prioridade,
        responsavelId: os.responsavel?.id ?? '',
        dataPrevisao:  os.dataPrevisao ? os.dataPrevisao.split('T')[0] : '',
        observacoes:   os.observacoes ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    try {
      await atualizarOS.mutateAsync({
        id:            os.id,
        descricao:     form.descricao     || undefined,
        prioridade:    form.prioridade     || undefined,
        responsavelId: form.responsavelId  || undefined,
        dataPrevisao:  form.dataPrevisao   || undefined,
        observacoes:   form.observacoes    || null,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Ordem de Serviço" size="lg">
      <div className="space-y-4">
        <Field label="Prioridade" required>
          <select className={selectCls} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </Field>
        <Field label="Responsável">
          <select className={selectCls} value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
            <option value="">Selecione o responsável</option>
            {mecanicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
        <Field label="Data de Previsão">
          <input className={inputCls} type="date" value={form.dataPrevisao} onChange={(e) => setForm({ ...form, dataPrevisao: e.target.value })} />
        </Field>
        <Field label="Descrição">
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Field>
        <Field label="Observações">
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizarOS.isPending} confirmLabel="Salvar" />
    </Modal>
  );
}
