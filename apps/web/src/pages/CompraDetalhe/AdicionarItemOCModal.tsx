import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, selectCls, inputCls } from '../../components/ui/Modal';
import { useAdicionarItemOC, useMateriais } from '../../hooks/useApi';

const emptyItem = { materialId: '', quantidade: '', precoUnitario: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  ocId: string;
}

export function AdicionarItemOCModal({ open, onClose, ocId }: Props) {
  const [form, setForm] = useState(emptyItem);

  const adicionarItem = useAdicionarItemOC();
  const { data: materiaisData } = useMateriais(1, '', undefined, 300);
  const materiais = materiaisData?.data ?? [];

  useEffect(() => {
    if (open) setForm(emptyItem);
  }, [open]);

  async function salvar() {
    if (!form.materialId || !form.quantidade || !form.precoUnitario) return;
    try {
      await adicionarItem.mutateAsync({
        ocId,
        materialId:    form.materialId,
        quantidade:    Number(form.quantidade),
        precoUnitario: Number(form.precoUnitario),
      });
      onClose();
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Item à OC" size="md">
      <div className="space-y-4">
        <Field label="Material" required>
          <select className={selectCls} value={form.materialId} onChange={(e) => {
            const m = materiais.find((x) => x.id === e.target.value);
            setForm({ ...form, materialId: e.target.value, precoUnitario: m ? String(m.precoUnitario) : form.precoUnitario });
          }}>
            <option value="">Selecione o material</option>
            {materiais.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade" required>
            <input className={inputCls} type="number" min="1" step="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} placeholder="Ex: 10" />
          </Field>
          <Field label="Preço unitário (R$)" required>
            <input className={inputCls} type="number" min="0" step="0.01" value={form.precoUnitario} onChange={(e) => setForm({ ...form, precoUnitario: e.target.value })} placeholder="0,00" />
          </Field>
        </div>
        {form.quantidade && form.precoUnitario && (
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">
              Subtotal: R$ {(Number(form.quantidade) * Number(form.precoUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={adicionarItem.isPending} disabled={!form.materialId || !form.quantidade || !form.precoUnitario} confirmLabel="Adicionar" />
    </Modal>
  );
}
