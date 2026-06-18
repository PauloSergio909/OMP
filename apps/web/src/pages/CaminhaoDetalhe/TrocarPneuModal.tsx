import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls } from '../../components/ui/Modal';
import { useRegistrarTrocaPneu, type PneuItem } from '../../hooks/useApi';
import { POSICOES_LABELS } from './pneus.constants';

interface Props {
  /** null = fechado; PneuItem = aberto para este pneu */
  pneu: PneuItem | null;
  onClose: () => void;
  caminhaoId: string;
  kmAtual: number;
}

export function TrocarPneuModal({ pneu, onClose, caminhaoId, kmAtual }: Props) {
  const [form, setForm] = useState({ kmTroca: '', motivo: '', custo: '', observacoes: '' });
  const registrarTroca = useRegistrarTrocaPneu();

  useEffect(() => {
    if (pneu) setForm({ kmTroca: String(kmAtual), motivo: '', custo: '', observacoes: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pneu]);

  async function salvar() {
    if (!pneu || !form.kmTroca || !form.motivo) return;
    try {
      await registrarTroca.mutateAsync({
        id: pneu.id,
        caminhaoId,
        kmTroca: Number(form.kmTroca),
        motivo: form.motivo,
        custo: form.custo ? Number(form.custo) : undefined,
        observacoes: form.observacoes || undefined,
      });
      onClose();
    } catch { /* handled by onError */ }
  }

  return (
    <Modal
      open={!!pneu}
      onClose={onClose}
      title={pneu ? `Trocar Pneu — ${POSICOES_LABELS[pneu.posicao] ?? pneu.posicao}` : 'Trocar Pneu'}
      size="md"
    >
      <div className="space-y-4">
        {pneu && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600">
            Pneu atual: <strong>{pneu.marca} {pneu.modelo}</strong>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="KM na troca" required>
            <input
              className={inputCls}
              type="number"
              min={pneu?.kmInstalacao ?? 0}
              value={form.kmTroca}
              onChange={(e) => setForm({ ...form, kmTroca: e.target.value })}
            />
          </Field>
          <Field label="Custo (R$)">
            <input className={inputCls} type="number" min="0" step="0.01" placeholder="0,00" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
          </Field>
        </div>
        <Field label="Motivo" required>
          <input className={inputCls} placeholder="Ex: Desgaste normal, dano irreparável..." value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
        </Field>
        <Field label="Observações">
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={registrarTroca.isPending} disabled={!form.kmTroca || !form.motivo} confirmLabel="Registrar Troca" />
    </Modal>
  );
}
