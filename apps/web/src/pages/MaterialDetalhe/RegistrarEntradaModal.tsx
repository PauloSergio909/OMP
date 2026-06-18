import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useRegistrarEntrada } from '../../hooks/useApi';
import { emptyEntrada } from './material.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  precoAtual: number;
}

export function RegistrarEntradaModal({ open, onClose, materialId, materialNome, unidadeMedida, precoAtual }: Props) {
  const [form, setForm] = useState(emptyEntrada);
  const registrar = useRegistrarEntrada();
  const val = useFormValidation<typeof emptyEntrada>({
    quantidade:    combine(required('Quantidade'), isPositive('Quantidade')),
    precoUnitario: combine(required('Preço unitário'), isPositive('Preço unitário')),
    motivo:        required('Motivo'),
  });

  useEffect(() => {
    if (open) { setForm({ ...emptyEntrada, precoUnitario: String(precoAtual) }); val.clearAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await registrar.mutateAsync({
        materialId,
        quantidade:    Number(form.quantidade),
        precoUnitario: Number(form.precoUnitario),
        motivo:        form.motivo,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Registrar Entrada — ${materialNome}`} size="sm">
      <div className="space-y-4">
        <Field label="Quantidade" required error={val.errors.quantidade}>
          <input
            className={`${inputCls} ${val.errors.quantidade ? 'border-red-400' : ''}`}
            type="number" step="1" min="1"
            value={form.quantidade}
            onChange={(e) => { setForm({ ...form, quantidade: e.target.value }); val.clearError('quantidade'); }}
            placeholder={`Ex: 50 ${unidadeMedida}`}
          />
        </Field>
        <Field label="Preço unitário (R$)" required error={val.errors.precoUnitario}>
          <input
            className={`${inputCls} ${val.errors.precoUnitario ? 'border-red-400' : ''}`}
            type="number" step="0.01" min="0"
            value={form.precoUnitario}
            onChange={(e) => { setForm({ ...form, precoUnitario: e.target.value }); val.clearError('precoUnitario'); }}
          />
        </Field>
        <Field label="Motivo / Nota fiscal" required error={val.errors.motivo}>
          <input
            className={`${inputCls} ${val.errors.motivo ? 'border-red-400' : ''}`}
            value={form.motivo}
            onChange={(e) => { setForm({ ...form, motivo: e.target.value }); val.clearError('motivo'); }}
            placeholder="Ex: NF 1234, Compra de reposição"
          />
        </Field>
        {form.quantidade && form.precoUnitario && (
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm text-green-700 font-medium">
              Valor total: R$ {(Number(form.quantidade) * Number(form.precoUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
      <ModalFooter
        onCancel={onClose} onConfirm={salvar} loading={registrar.isPending}
        disabled={!form.quantidade || !form.precoUnitario || !form.motivo}
        confirmLabel="Registrar Entrada"
      />
    </Modal>
  );
}
