import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, isPositive } from '../../hooks/useFormValidation';
import { useAtualizarCaminhao, useMotoristasDisponiveis, type CaminhaoListItem } from '../../hooks/useApi';

const emptyEdit = { modelo: '', fabricante: '', kmAtual: '', status: '', motoristaId: '', motoristaNome: '', proximaManutencao: '' };

interface Props {
  caminhao: CaminhaoListItem | null;
  onClose: () => void;
}

export function EditarCaminhaoModal({ caminhao, onClose }: Props) {
  const [form, setForm] = useState(emptyEdit);
  const { data: motoristas } = useMotoristasDisponiveis();
  const atualizar = useAtualizarCaminhao();

  const { errors, validate, clearAll, clearError } = useFormValidation<typeof emptyEdit>({
    kmAtual: isPositive('KM Atual'),
  });

  useEffect(() => {
    if (caminhao) {
      setForm({
        modelo: caminhao.modelo ?? '',
        fabricante: caminhao.fabricante ?? '',
        kmAtual: String(caminhao.kmAtual ?? 0),
        status: caminhao.status ?? '',
        motoristaId: caminhao.motorista?.id ?? '',
        motoristaNome: caminhao.motorista?.nome ?? '',
        proximaManutencao: caminhao.proximaManutencao ? caminhao.proximaManutencao.split('T')[0] : '',
      });
      clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminhao]);

  async function salvar() {
    if (!caminhao || !validate(form)) return;
    try {
      await atualizar.mutateAsync({
        id: caminhao.id,
        modelo: form.modelo || undefined,
        fabricante: form.fabricante || undefined,
        kmAtual: form.kmAtual ? Number(form.kmAtual) : undefined,
        status: form.status || undefined,
        motoristaId: form.motoristaId || null,
        proximaManutencao: form.proximaManutencao || null,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={caminhao !== null} onClose={onClose} title="Editar Caminhão" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Fabricante">
          <input className={inputCls} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
        </Field>
        <Field label="Modelo">
          <input className={inputCls} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
        </Field>
        <Field label="KM Atual" error={errors.kmAtual}>
          <input className={`${inputCls} ${errors.kmAtual ? 'border-red-400' : ''}`} type="number" min="0" value={form.kmAtual} onChange={(e) => { setForm({ ...form, kmAtual: e.target.value }); clearError('kmAtual'); }} />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="operacional">Operacional</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="parado">Parado</option>
          </select>
        </Field>
        <Field label="Motorista">
          <select className={selectCls} value={form.motoristaId} onChange={(e) => setForm({ ...form, motoristaId: e.target.value })}>
            <option value="">Sem motorista</option>
            {(motoristas ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome} {m.cnhCategoria ? `— CNH ${m.cnhCategoria}` : ''}</option>)}
            {form.motoristaId && !motoristas?.some((m: { id: string }) => m.id === form.motoristaId) && (
              <option value={form.motoristaId}>{form.motoristaNome} (atual)</option>
            )}
          </select>
        </Field>
        <Field label="Próxima Manutenção">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaManutencao} onChange={(e) => setForm({ ...form, proximaManutencao: e.target.value })} />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizar.isPending} disabled={!form.kmAtual} confirmLabel="Salvar" />
    </Modal>
  );
}
