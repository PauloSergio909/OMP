import { useState } from 'react';
import { Modal, Field, ModalFooter, inputCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useRegistrarKm } from '../../hooks/useApi';

interface Props {
  open: boolean;
  onClose: () => void;
  caminhaoId: string;
  kmAtual: number;
}

export function RegistrarKmModal({ open, onClose, caminhaoId, kmAtual }: Props) {
  const [kmForm, setKmForm] = useState('');
  const registrarKm = useRegistrarKm();

  const { errors, validate, clearAll, clearError } = useFormValidation<{ km: string }>({
    km: combine(required('KM'), isPositive('KM')),
  });

  function fechar() { onClose(); setKmForm(''); clearAll(); }

  async function salvar() {
    if (!validate({ km: kmForm })) return;
    try {
      await registrarKm.mutateAsync({ id: caminhaoId, km: Number(kmForm) });
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Registrar Quilometragem" size="sm">
      <Field label="Novo KM do veículo" required error={errors.km}>
        <input
          className={`${inputCls} ${errors.km ? 'border-red-400' : ''}`}
          type="number"
          min={kmAtual}
          max="9999999"
          value={kmForm}
          onChange={(e) => { setKmForm(e.target.value); clearError('km'); }}
          placeholder={`Atual: ${kmAtual.toLocaleString('pt-BR')} km`}
          autoFocus
        />
      </Field>
      <p className="text-xs text-gray-400 mt-2">
        KM atual: <span className="font-semibold text-gray-700">{kmAtual.toLocaleString('pt-BR')} km</span>
      </p>
      <ModalFooter onCancel={fechar} onConfirm={salvar} loading={registrarKm.isPending} disabled={!kmForm} confirmLabel="Registrar" />
    </Modal>
  );
}
