import { useState, useEffect } from 'react';
import { ToggleRight, ToggleLeft } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import {
  useCriarMaterial, useAtualizarMaterial, useCategorias, useFornecedores,
  type MaterialListItem,
} from '../../hooks/useApi';

const unidades = ['litro', 'unidade', 'jogo', 'metro', 'kg', 'par'];

const emptyMaterial = {
  nome: '', categoriaId: '', unidadeMedida: 'unidade',
  precoUnitario: '', estoqueMinimo: '', estoqueMaximo: '', fornecedorId: '',
};

function matMaxRule(val: unknown, form: unknown) {
  const f = form as typeof emptyMaterial;
  if (!val || !f.estoqueMinimo) return undefined;
  return Number(val) <= Number(f.estoqueMinimo) ? 'Estoque máximo deve ser maior que o mínimo' : undefined;
}

// ─── Novo Material ────────────────────────────────────────────────────────────

interface NovaMaterialProps {
  open: boolean;
  onClose: () => void;
}

export function NovaMaterialModal({ open, onClose }: NovaMaterialProps) {
  const [form, setForm] = useState(emptyMaterial);
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();
  const criarMaterial = useCriarMaterial();

  const val = useFormValidation<typeof emptyMaterial>({
    nome:          required('Nome'),
    categoriaId:   required('Categoria'),
    fornecedorId:  required('Fornecedor'),
    precoUnitario: combine(required('Preço'), isPositive('Preço')),
    estoqueMinimo: required('Estoque mínimo'),
    estoqueMaximo: combine(required('Estoque máximo'), isPositive('Estoque máximo'), matMaxRule),
  });

  function fechar() { onClose(); setForm(emptyMaterial); val.clearAll(); }

  async function salvar() {
    if (!val.validate(form)) return;
    try {
      await criarMaterial.mutateAsync({
        ...form,
        precoUnitario: Number(form.precoUnitario),
        estoqueMinimo: Number(form.estoqueMinimo),
        estoqueMaximo: Number(form.estoqueMaximo),
      });
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Novo Material" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome do material" required error={val.errors.nome}>
          <input className={`${inputCls} ${val.errors.nome ? 'border-red-400' : ''}`} value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); val.clearError('nome'); }} onBlur={() => val.validateField('nome', form)} placeholder="Ex: Óleo Motor 15W-40" />
        </Field>
        <Field label="Unidade de medida" required>
          <select className={selectCls} value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })}>
            {unidades.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
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
          <input className={`${inputCls} ${val.errors.precoUnitario ? 'border-red-400' : ''}`} type="number" step="0.01" min="0" value={form.precoUnitario} onChange={(e) => { setForm({ ...form, precoUnitario: e.target.value }); val.clearError('precoUnitario'); }} onBlur={() => val.validateField('precoUnitario', form)} placeholder="0,00" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estoque mínimo" required error={val.errors.estoqueMinimo}>
            <input className={`${inputCls} ${val.errors.estoqueMinimo ? 'border-red-400' : ''}`} type="number" min="0" value={form.estoqueMinimo} onChange={(e) => { setForm({ ...form, estoqueMinimo: e.target.value }); val.clearError('estoqueMinimo'); }} onBlur={() => val.validateField('estoqueMinimo', form)} placeholder="0" />
          </Field>
          <Field label="Estoque máximo" required error={val.errors.estoqueMaximo}>
            <input className={`${inputCls} ${val.errors.estoqueMaximo ? 'border-red-400' : ''}`} type="number" min="1" value={form.estoqueMaximo} onChange={(e) => { setForm({ ...form, estoqueMaximo: e.target.value }); val.clearError('estoqueMaximo'); }} onBlur={() => val.validateField('estoqueMaximo', form)} placeholder="0" />
          </Field>
        </div>
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={criarMaterial.isPending}
        disabled={!form.nome || !form.categoriaId || !form.fornecedorId || !form.precoUnitario || !form.estoqueMinimo || !form.estoqueMaximo}
        confirmLabel="Cadastrar"
      />
    </Modal>
  );
}

// ─── Editar Material ──────────────────────────────────────────────────────────

interface EditarMaterialProps {
  material: MaterialListItem | null;
  onClose: () => void;
}

export function EditarMaterialModal({ material, onClose }: EditarMaterialProps) {
  const [form, setForm] = useState({
    nome: '', categoriaId: '', unidadeMedida: 'unidade',
    precoUnitario: '', estoqueMinimo: '', estoqueMaximo: '', fornecedorId: '', ativo: true,
  });
  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();
  const atualizarMaterial = useAtualizarMaterial();

  const val = useFormValidation({
    nome:          required('Nome'),
    categoriaId:   required('Categoria'),
    fornecedorId:  required('Fornecedor'),
    precoUnitario: combine(required('Preço'), isPositive('Preço')),
    estoqueMinimo: required('Estoque mínimo'),
    estoqueMaximo: combine(required('Estoque máximo'), isPositive('Estoque máximo'), matMaxRule),
  });

  useEffect(() => {
    if (material) {
      setForm({
        nome: material.nome,
        categoriaId: material.categoriaId,
        unidadeMedida: material.unidadeMedida,
        precoUnitario: String(material.precoUnitario),
        estoqueMinimo: String(material.estoqueMinimo),
        estoqueMaximo: String(material.estoqueMaximo),
        fornecedorId: material.fornecedorId,
        ativo: material.ativo ?? true,
      });
      val.clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material]);

  async function salvar() {
    if (!material) return;
    if (!val.validate(form)) return;
    try {
      await atualizarMaterial.mutateAsync({
        id: material.id,
        nome: form.nome,
        categoriaId: form.categoriaId,
        unidadeMedida: form.unidadeMedida,
        precoUnitario: Number(form.precoUnitario),
        estoqueMinimo: Number(form.estoqueMinimo),
        estoqueMaximo: Number(form.estoqueMaximo),
        fornecedorId: form.fornecedorId,
        ativo: form.ativo,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={material !== null} onClose={onClose} title="Editar Material" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome do material" required error={val.errors.nome}>
          <input className={`${inputCls} ${val.errors.nome ? 'border-red-400' : ''}`} value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); val.clearError('nome'); }} />
        </Field>
        <Field label="Unidade de medida" required>
          <select className={selectCls} value={form.unidadeMedida} onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })}>
            {unidades.map((u) => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Categoria" required error={val.errors.categoriaId}>
          <select className={`${selectCls} ${val.errors.categoriaId ? 'border-red-400' : ''}`} value={form.categoriaId} onChange={(e) => { setForm({ ...form, categoriaId: e.target.value }); val.clearError('categoriaId'); }}>
            <option value="">Selecione</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Fornecedor" required error={val.errors.fornecedorId}>
          <select className={`${selectCls} ${val.errors.fornecedorId ? 'border-red-400' : ''}`} value={form.fornecedorId} onChange={(e) => { setForm({ ...form, fornecedorId: e.target.value }); val.clearError('fornecedorId'); }}>
            <option value="">Selecione</option>
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
            <input className={`${inputCls} ${val.errors.estoqueMaximo ? 'border-red-400' : ''}`} type="number" min="1" value={form.estoqueMaximo} onChange={(e) => { setForm({ ...form, estoqueMaximo: e.target.value }); val.clearError('estoqueMaximo'); }} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">Situação do material</p>
          <p className="text-xs text-gray-400 mt-0.5">{form.ativo ? 'Ativo — aparece nas listagens e no estoque' : 'Inativo — arquivado, não aparece nas listagens'}</p>
        </div>
        <button type="button" onClick={() => setForm({ ...form, ativo: !form.ativo })} aria-label={form.ativo ? 'Desativar material' : 'Ativar material'} className="ml-4 flex-shrink-0">
          {form.ativo ? <ToggleRight size={28} className="text-blue-600" /> : <ToggleLeft size={28} className="text-gray-300" />}
        </button>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={salvar}
        loading={atualizarMaterial.isPending}
        disabled={!form.nome || !form.categoriaId || !form.fornecedorId || !form.precoUnitario || !form.estoqueMinimo || !form.estoqueMaximo}
        confirmLabel="Salvar alterações"
      />
    </Modal>
  );
}
