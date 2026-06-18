import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine, inRange } from '../../hooks/useFormValidation';
import { useAdicionarItemOS, useMateriais } from '../../hooks/useApi';

const emptyItem = { tipo: 'material', materialId: '', quantidade: '', precoUnitario: '', descricao: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  osId: string;
}

export function AdicionarItemModal({ open, onClose, osId }: Props) {
  const [form, setForm] = useState(emptyItem);
  const adicionarItem = useAdicionarItemOS();
  const { data: materiaisData } = useMateriais(1, '', undefined, 200);
  const materiais = materiaisData?.data ?? [];

  const { errors, validate, clearAll, clearError } = useFormValidation<typeof emptyItem>({
    quantidade:    combine(required('Quantidade'), isPositive('Quantidade')),
    precoUnitario: combine(required('Preço unitário'), inRange(0, 9_999_999, 'Preço unitário')),
  });

  useEffect(() => {
    if (open) { setForm(emptyItem); clearAll(); }
  }, [open]);

  async function salvar() {
    if (!validate(form)) return;
    try {
      await adicionarItem.mutateAsync({
        id:            osId,
        tipo:          form.tipo,
        materialId:    form.materialId || undefined,
        quantidade:    Number(form.quantidade),
        precoUnitario: Number(form.precoUnitario),
        descricao:     form.descricao || undefined,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  function fechar() { onClose(); }

  return (
    <Modal open={open} onClose={fechar} title="Adicionar Item à OS" size="md">
      <div className="space-y-4">
        <Field label="Tipo de item" required>
          <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...emptyItem, tipo: e.target.value })}>
            <option value="material">Material do estoque</option>
            <option value="mao_de_obra">Mão de obra</option>
          </select>
        </Field>
        {form.tipo === 'material' ? (
          <Field label="Material">
            <select className={selectCls} value={form.materialId} onChange={(e) => {
              const m = materiais.find((x) => x.id === e.target.value);
              setForm({ ...form, materialId: e.target.value, precoUnitario: m ? String(m.precoUnitario) : form.precoUnitario });
            }}>
              <option value="">Selecione o material</option>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>{m.codigo} — {m.nome} (estoque: {m.estoques?.[0]?.quantidade ?? 0})</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Descrição do serviço" required>
            <input className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Mão de obra — Troca de pastilha" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade" required error={errors.quantidade}>
            <input className={`${inputCls} ${errors.quantidade ? 'border-red-400' : ''}`} type="number" min="1" step="1" value={form.quantidade} onChange={(e) => { setForm({ ...form, quantidade: e.target.value }); clearError('quantidade'); }} placeholder="Ex: 4" />
          </Field>
          <Field label="Preço unitário (R$)" required error={errors.precoUnitario}>
            <input className={`${inputCls} ${errors.precoUnitario ? 'border-red-400' : ''}`} type="number" min="0" step="0.01" value={form.precoUnitario} onChange={(e) => { setForm({ ...form, precoUnitario: e.target.value }); clearError('precoUnitario'); }} placeholder="0,00" />
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
      <ModalFooter
        onCancel={fechar} onConfirm={salvar} loading={adicionarItem.isPending}
        disabled={!form.quantidade || !form.precoUnitario || (form.tipo === 'mao_de_obra' && !form.descricao)}
        confirmLabel="Adicionar"
      />
    </Modal>
  );
}
