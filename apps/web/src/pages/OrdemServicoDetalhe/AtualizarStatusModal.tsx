import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useAtualizarStatusOS } from '../../hooks/useApi';
import { statusFlow, allowedTransitions } from './os.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  osId: string;
  currentStatus: string;
}

export function AtualizarStatusModal({ open, onClose, osId, currentStatus }: Props) {
  const [novoStatus, setNovoStatus] = useState('');
  const [obsStatus, setObsStatus]   = useState('');
  const atualizarStatus = useAtualizarStatusOS();

  useEffect(() => {
    if (open) { setNovoStatus(''); setObsStatus(''); }
  }, [open]);

  async function salvar() {
    if (!novoStatus) return;
    try {
      await atualizarStatus.mutateAsync({ id: osId, status: novoStatus, observacoes: obsStatus });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Atualizar Status da OS" size="sm">
      <div className="space-y-4">
        <Field label="Novo status" required>
          <select className={selectCls} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
            <option value="">Selecione o novo status</option>
            {statusFlow
              .filter((s) => (allowedTransitions[currentStatus] ?? []).includes(s.value))
              .map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Observações">
          <textarea
            className={`${inputCls} resize-none`} rows={3}
            value={obsStatus} onChange={(e) => setObsStatus(e.target.value)}
            placeholder="Motivo da mudança de status..."
          />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizarStatus.isPending} disabled={!novoStatus} confirmLabel="Atualizar" />
    </Modal>
  );
}
