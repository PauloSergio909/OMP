import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useCriarPneu } from '../../hooks/useApi';
import { POSICOES_LABELS } from './pneus.constants';

const emptyForm = {
  posicao: 'dianteiro_esq', marca: '', modelo: '', numeroSerie: '', kmInstalacao: '', kmVidaUtil: '80000',
};

interface Props {
  open: boolean;
  onClose: () => void;
  caminhaoId: string;
  kmAtual: number;
}

export function CadastrarPneuModal({ open, onClose, caminhaoId, kmAtual }: Props) {
  const [form, setForm] = useState(emptyForm);
  const criarPneu = useCriarPneu();

  useEffect(() => {
    if (open) setForm({ ...emptyForm, kmInstalacao: String(kmAtual) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!form.marca || !form.modelo) return;
    try {
      await criarPneu.mutateAsync({
        caminhaoId,
        posicao: form.posicao,
        marca: form.marca,
        modelo: form.modelo,
        numeroSerie: form.numeroSerie || undefined,
        kmInstalacao: Number(form.kmInstalacao) || 0,
        kmVidaUtil: Number(form.kmVidaUtil) || 80000,
      });
      onClose();
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar Pneu" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Posição" required>
            <select className={selectCls} value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })}>
              {Object.entries(POSICOES_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </Field>
          <Field label="KM na instalação" required>
            <input className={inputCls} type="number" min="0" value={form.kmInstalacao} onChange={(e) => setForm({ ...form, kmInstalacao: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Marca" required>
            <input className={inputCls} placeholder="Ex: Bridgestone" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </Field>
          <Field label="Modelo" required>
            <input className={inputCls} placeholder="Ex: R22.5" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nº Série">
            <input className={inputCls} placeholder="Opcional" value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} />
          </Field>
          <Field label="Vida útil (km)">
            <input className={inputCls} type="number" min="10000" value={form.kmVidaUtil} onChange={(e) => setForm({ ...form, kmVidaUtil: e.target.value })} />
          </Field>
        </div>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={criarPneu.isPending} disabled={!form.marca || !form.modelo} confirmLabel="Cadastrar" />
    </Modal>
  );
}
