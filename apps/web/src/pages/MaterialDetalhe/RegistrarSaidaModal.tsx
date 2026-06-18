import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useRegistrarSaida } from '../../hooks/useApi';
import { emptySaida } from './material.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  qtdAtual: number;
  isCritico: boolean;
}

export function RegistrarSaidaModal({ open, onClose, materialId, materialNome, unidadeMedida, qtdAtual, isCritico }: Props) {
  const [form, setForm] = useState(emptySaida);
  const registrar = useRegistrarSaida();
  const val = useFormValidation<typeof emptySaida>({
    quantidade: combine(required('Quantidade'), isPositive('Quantidade')),
    motivo:     required('Motivo'),
  });

  useEffect(() => {
    if (open) { setForm(emptySaida); val.clearAll(); }
  }, [open]);

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await registrar.mutateAsync({
        materialId,
        quantidade: Number(form.quantidade),
        motivo:     form.motivo,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Registrar Saída — ${materialNome}`} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <Package size={14} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            Disponível: <strong className={isCritico ? 'text-red-600' : 'text-gray-900'}>{qtdAtual} {unidadeMedida}</strong>
          </span>
        </div>
        <Field label="Quantidade" required error={val.errors.quantidade}>
          <input
            className={`${inputCls} ${val.errors.quantidade ? 'border-red-400' : ''}`}
            type="number" step="1" min="1" max={qtdAtual}
            value={form.quantidade}
            onChange={(e) => { setForm({ ...form, quantidade: e.target.value }); val.clearError('quantidade'); }}
            placeholder={`Máx: ${qtdAtual}`}
          />
        </Field>
        <Field label="Motivo / OS vinculada" required error={val.errors.motivo}>
          <input
            className={`${inputCls} ${val.errors.motivo ? 'border-red-400' : ''}`}
            value={form.motivo}
            onChange={(e) => { setForm({ ...form, motivo: e.target.value }); val.clearError('motivo'); }}
            placeholder="Ex: OS-2024-001, Manutenção preventiva"
          />
        </Field>
      </div>
      <ModalFooter
        onCancel={onClose} onConfirm={salvar} loading={registrar.isPending}
        disabled={!form.quantidade || !form.motivo}
        confirmLabel="Registrar Saída"
      />
    </Modal>
  );
}
