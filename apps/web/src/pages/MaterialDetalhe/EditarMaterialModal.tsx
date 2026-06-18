import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useAtualizarMaterial, useCategorias, useFornecedores, type MaterialDetalhe } from '../../hooks/useApi';
import { unidades, emptyEdit } from './material.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  material: MaterialDetalhe;
}

export function EditarMaterialModal({ open, onClose, material }: Props) {
  const [form, setForm] = useState(emptyEdit);
  const atualizar = useAtualizarMaterial();
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();

  const val = useFormValidation<typeof emptyEdit>({
    nome:          required('Nome'),
    categoriaId:   required('Categoria'),
    fornecedorId:  required('Fornecedor'),
    precoUnitario: combine(required('Preço'), isPositive('Preço')),
    estoqueMinimo: required('Estoque mínimo'),
    estoqueMaximo: combine(
      required('Estoque máximo'),
      isPositive('Estoque máximo'),
      (val, f) => {
        const ff = f as typeof emptyEdit;
        if (!val || !ff.estoqueMinimo) return undefined;
        return Number(val) <= Number(ff.estoqueMinimo) ? 'Estoque máximo deve ser maior que o mínimo' : undefined;
      },
    ),
  });

  useEffect(() => {
    if (open) {
      setForm({
        nome:          material.nome,
        categoriaId:   material.categoria?.id ?? '',
        unidadeMedida: material.unidadeMedida,
        precoUnitario: String(material.precoUnitario),
        estoqueMinimo: String(material.estoqueMinimo),
        estoqueMaximo: String(material.estoqueMaximo),
        fornecedorId:  material.fornecedor?.id ?? '',
      });
      val.clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await atualizar.mutateAsync({
        id:            material.id,
        nome:          form.nome,
        categoriaId:   form.categoriaId,
        unidadeMedida: form.unidadeMedida,
        precoUnitario: Number(form.precoUnitario),
        estoqueMinimo: Number(form.estoqueMinimo),
        estoqueMaximo: Number(form.estoqueMaximo),
        fornecedorId:  form.fornecedorId,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Material" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome" required error={val.errors.nome}>
          <input className={`${inputCls} ${val.errors.nome ? 'border-red-400' : ''}`} value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); val.clearError('nome'); }} />
        </Field>
        <Field label="Unidade de medida" required>
          <select className={selectCls} value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })}>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Categoria" required error={val.errors.categoriaId}>
          <select className={`${selectCls} ${val.errors.categoriaId ? 'border-red-400' : ''}`} value={form.categoriaId} onChange={(e) => { setForm({ ...form, categoriaId: e.target.value }); val.clearError('categoriaId'); }}>
            <option value="">Selecione a categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Fornecedor" required error={val.errors.fornecedorId}>
          <select className={`${selectCls} ${val.errors.fornecedorId ? 'border-red-400' : ''}`} value={form.fornecedorId} onChange={(e) => { setForm({ ...form, fornecedorId: e.target.value }); val.clearError('fornecedorId'); }}>
            <option value="">Selecione o fornecedor</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
          </select>
        </Field>
        <Field label="Preço unitário (R$)" required error={val.errors.precoUnitario}>
          <input className={`${inputCls} ${val.errors.precoUnitario ? 'border-red-400' : ''}`} type="number" step="0.01" min="0" value={form.precoUnitario} onChange={(e) => { setForm({ ...form, precoUnitario: e.target.value }); val.clearError('precoUnitario'); }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estoque mínimo" required error={val.errors.estoqueMinimo}>
            <input className={`${inputCls} ${val.errors.estoqueMinimo ? 'border-red-400' : ''}`} type="number" min="0" value={form.estoqueMinimo} onChange={(e) => { setForm({ ...form, estoqueMinimo: e.target.value }); val.clearError('estoqueMinimo'); val.clearError('estoqueMaximo'); }} />
          </Field>
          <Field label="Estoque máximo" required error={val.errors.estoqueMaximo}>
            <input className={`${inputCls} ${val.errors.estoqueMaximo ? 'border-red-400' : ''}`} type="number" min="0" value={form.estoqueMaximo} onChange={(e) => { setForm({ ...form, estoqueMaximo: e.target.value }); val.clearError('estoqueMaximo'); }} />
          </Field>
        </div>
      </div>
      <ModalFooter
        onCancel={onClose} onConfirm={salvar} loading={atualizar.isPending}
        disabled={!form.nome || !form.categoriaId || !form.fornecedorId || !form.precoUnitario || !form.estoqueMaximo}
        confirmLabel="Salvar"
      />
    </Modal>
  );
}
