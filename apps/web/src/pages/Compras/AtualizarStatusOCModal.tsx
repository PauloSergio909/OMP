import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal, Field, ModalFooter, selectCls } from '../../components/ui/Modal';
import { useAtualizarStatusCompra } from '../../hooks/useApi';

interface OCStatusTarget {
  id: string;
  status: string;
  codigo: string;
}

interface Props {
  oc: OCStatusTarget | null;
  onClose: () => void;
}

export function AtualizarStatusOCModal({ oc, onClose }: Props) {
  const [novoStatus, setNovoStatus] = useState('');
  const atualizarStatus = useAtualizarStatusCompra();

  useEffect(() => {
    if (oc) setNovoStatus('');
  }, [oc]);

  async function confirmar() {
    if (!oc || !novoStatus) return;
    try {
      await atualizarStatus.mutateAsync({ id: oc.id, status: novoStatus });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={!!oc} onClose={onClose} title={`Atualizar OC ${oc?.codigo ?? ''}`} size="sm">
      <Field label="Novo status" required>
        <select className={selectCls} value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
          <option value="">Selecione o novo status</option>
          {oc?.status === 'pendente' && (
            <>
              <option value="aprovada">Aprovar</option>
              <option value="cancelada">Cancelar</option>
            </>
          )}
          {oc?.status === 'aprovada' && (
            <>
              <option value="recebida">Marcar como Recebida (entra no estoque)</option>
              <option value="cancelada">Cancelar</option>
            </>
          )}
        </select>
      </Field>
      {novoStatus === 'recebida' && (
        <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs text-green-700 font-medium">Ao confirmar, o estoque será atualizado automaticamente com os itens desta OC.</p>
        </div>
      )}
      {novoStatus === 'cancelada' && (
        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 font-medium">Esta ação é <strong>irreversível</strong>. A OC será cancelada permanentemente.</p>
        </div>
      )}
      <ModalFooter onCancel={onClose} onConfirm={confirmar} loading={atualizarStatus.isPending} disabled={!novoStatus} confirmLabel="Confirmar" />
    </Modal>
  );
}
