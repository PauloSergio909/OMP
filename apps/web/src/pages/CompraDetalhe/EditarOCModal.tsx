import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls } from '../../components/ui/Modal';
import { useAtualizarCompra } from '../../hooks/useApi';

interface OCEditTarget {
  id: string;
  codigo: string;
  dataEntrega?: string | null;
  observacoes?: string | null;
}

interface Props {
  oc: OCEditTarget | null;
  onClose: () => void;
}

export function EditarOCModal({ oc, onClose }: Props) {
  const [form, setForm] = useState({ dataEntrega: '', observacoes: '' });
  const atualizarOC = useAtualizarCompra();

  useEffect(() => {
    if (oc) {
      setForm({
        dataEntrega: oc.dataEntrega ? oc.dataEntrega.slice(0, 10) : '',
        observacoes: oc.observacoes ?? '',
      });
    }
  }, [oc]);

  async function salvar() {
    if (!oc) return;
    try {
      await atualizarOC.mutateAsync({
        id:          oc.id,
        dataEntrega: form.dataEntrega || null,
        observacoes: form.observacoes || null,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={!!oc} onClose={onClose} title={`Editar OC ${oc?.codigo ?? ''}`} size="sm">
      <div className="space-y-4">
        <Field label="Previsão de entrega">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.dataEntrega} onChange={(e) => setForm({ ...form, dataEntrega: e.target.value })} />
        </Field>
        <Field label="Observações">
          <textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações adicionais sobre esta OC" />
        </Field>
        <p className="text-xs text-gray-400">Apenas data de entrega e observações podem ser alteradas aqui.</p>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizarOC.isPending} confirmLabel="Salvar" />
    </Modal>
  );
}
