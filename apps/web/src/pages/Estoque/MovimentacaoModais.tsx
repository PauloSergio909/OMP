import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useRegistrarEntrada, useRegistrarSaida, useMateriais } from '../../hooks/useApi';

const emptyEntrada = { materialId: '', quantidade: '', precoUnitario: '', motivo: '' };
const emptySaida   = { materialId: '', quantidade: '', motivo: '' };

// ─── Entrada ──────────────────────────────────────────────────────────────────

interface EntradaProps {
  open: boolean;
  onClose: () => void;
  initialMaterialId?: string;
  initialPreco?: string;
}

export function EntradaEstoqueModal({ open, onClose, initialMaterialId, initialPreco }: EntradaProps) {
  const [form, setForm] = useState(emptyEntrada);
  const { data: allMatData } = useMateriais(1, '', undefined, 500);
  const materiais = allMatData?.data ?? [];
  const registrarEntrada = useRegistrarEntrada();

  const val = useFormValidation<typeof emptyEntrada>({
    materialId:    required('Material'),
    quantidade:    combine(required('Quantidade'), isPositive('Quantidade')),
    precoUnitario: combine(required('Preço unitário'), isPositive('Preço unitário')),
    motivo:        required('Motivo'),
  });

  useEffect(() => {
    if (open) {
      setForm({ ...emptyEntrada, materialId: initialMaterialId ?? '', precoUnitario: initialPreco ?? '' });
      val.clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fechar() { onClose(); }

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await registrarEntrada.mutateAsync({
        materialId: form.materialId,
        quantidade: Number(form.quantidade),
        precoUnitario: Number(form.precoUnitario),
        motivo: form.motivo,
      });
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Registrar Entrada de Estoque" size="md">
      <div className="space-y-4">
        <Field label="Material" required error={val.errors.materialId}>
          <select className={`${selectCls} ${val.errors.materialId ? 'border-red-400' : ''}`} value={form.materialId} onChange={(e) => { setForm({ ...form, materialId: e.target.value }); val.clearError('materialId'); }}>
            <option value="">Selecione o material</option>
            {materiais.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
          </select>
        </Field>
        <Field label="Quantidade" required error={val.errors.quantidade}>
          <input className={`${inputCls} ${val.errors.quantidade ? 'border-red-400' : ''}`} type="number" min="1" value={form.quantidade} onChange={(e) => { setForm({ ...form, quantidade: e.target.value }); val.clearError('quantidade'); }} placeholder="Ex: 50" />
        </Field>
        <Field label="Preço unitário (R$)" required error={val.errors.precoUnitario}>
          <input className={`${inputCls} ${val.errors.precoUnitario ? 'border-red-400' : ''}`} type="number" step="0.01" min="0" value={form.precoUnitario} onChange={(e) => { setForm({ ...form, precoUnitario: e.target.value }); val.clearError('precoUnitario'); }} placeholder="0,00" />
        </Field>
        <Field label="Motivo / NF" required error={val.errors.motivo}>
          <input className={`${inputCls} ${val.errors.motivo ? 'border-red-400' : ''}`} value={form.motivo} onChange={(e) => { setForm({ ...form, motivo: e.target.value }); val.clearError('motivo'); }} placeholder="Ex: Compra NF 12345" />
        </Field>
        {form.quantidade && form.precoUnitario && (
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm text-green-700 font-medium">
              Total: R$ {(Number(form.quantidade) * Number(form.precoUnitario)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={registrarEntrada.isPending}
        disabled={!form.materialId}
        confirmLabel="Registrar Entrada"
      />
    </Modal>
  );
}

// ─── Saída ────────────────────────────────────────────────────────────────────

interface SaidaProps {
  open: boolean;
  onClose: () => void;
  initialMaterialId?: string;
}

export function SaidaEstoqueModal({ open, onClose, initialMaterialId }: SaidaProps) {
  const [form, setForm] = useState(emptySaida);
  const { data: allMatData } = useMateriais(1, '', undefined, 500);
  const materiais = allMatData?.data ?? [];
  const registrarSaida = useRegistrarSaida();

  const val = useFormValidation<typeof emptySaida>({
    materialId: required('Material'),
    quantidade: combine(required('Quantidade'), isPositive('Quantidade')),
    motivo:     required('Motivo'),
  });

  useEffect(() => {
    if (open) {
      setForm({ ...emptySaida, materialId: initialMaterialId ?? '' });
      val.clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fechar() { onClose(); }

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await registrarSaida.mutateAsync({
        materialId: form.materialId,
        quantidade: Number(form.quantidade),
        motivo: form.motivo,
      });
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Registrar Saída de Estoque" size="md">
      <div className="space-y-4">
        <Field label="Material" required error={val.errors.materialId}>
          <select className={`${selectCls} ${val.errors.materialId ? 'border-red-400' : ''}`} value={form.materialId} onChange={(e) => { setForm({ ...form, materialId: e.target.value }); val.clearError('materialId'); }}>
            <option value="">Selecione o material</option>
            {materiais.map((m) => {
              const qtd = m.estoques?.[0]?.quantidade ?? 0;
              return <option key={m.id} value={m.id}>{m.codigo} — {m.nome} (estoque: {qtd})</option>;
            })}
          </select>
        </Field>
        <Field label="Quantidade" required error={val.errors.quantidade}>
          <input className={`${inputCls} ${val.errors.quantidade ? 'border-red-400' : ''}`} type="number" min="1" value={form.quantidade} onChange={(e) => { setForm({ ...form, quantidade: e.target.value }); val.clearError('quantidade'); }} placeholder="Ex: 10" />
        </Field>
        <Field label="Motivo" required error={val.errors.motivo}>
          <input className={`${inputCls} ${val.errors.motivo ? 'border-red-400' : ''}`} value={form.motivo} onChange={(e) => { setForm({ ...form, motivo: e.target.value }); val.clearError('motivo'); }} placeholder="Ex: Uso em OS-2026-012" />
        </Field>
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={registrarSaida.isPending}
        disabled={!form.materialId}
        confirmLabel="Registrar Saída"
      />
    </Modal>
  );
}
