import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, isPositive, combine } from '../../hooks/useFormValidation';
import { useRegistrarAbastecimento, useCaminhoes, useFuncionarios } from '../../hooks/useApi';
import { emptyForm, combustivelOptions } from './abastecimento.constants';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RegistrarAbastecimentoModal({ open, onClose }: Props) {
  const [form, setForm] = useState(emptyForm);

  const registrar = useRegistrarAbastecimento();
  const { data: caminhoesList } = useCaminhoes(1, undefined, undefined, 200);
  const { data: funcList } = useFuncionarios(1, '', 'motorista', undefined, 200);
  const caminhoes = caminhoesList?.data ?? [];
  const motoristas = funcList?.data ?? [];

  const { errors, validate, clearAll, validateField, clearError } = useFormValidation<typeof emptyForm>({
    caminhaoId:  required('Caminhão'),
    motoristaId: required('Motorista'),
    litros:      combine(required('Litros'), isPositive('Litros')),
    precoLitro:  combine(required('Preço por litro'), isPositive('Preço por litro')),
    kmAtual:     combine(required('KM atual'), isPositive('KM atual')),
    posto:       required('Posto'),
  });

  useEffect(() => {
    if (open) { setForm(emptyForm); clearAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!validate(form)) return;
    try {
      await registrar.mutateAsync({
        ...form,
        litros:     Number(form.litros),
        precoLitro: Number(form.precoLitro),
        kmAtual:    Number(form.kmAtual),
        data:       form.data || undefined,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Abastecimento" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Caminhão" required error={errors.caminhaoId}>
          <select className={`${selectCls} ${errors.caminhaoId ? 'border-red-400' : ''}`} value={form.caminhaoId} onChange={(e) => { setForm({ ...form, caminhaoId: e.target.value }); clearError('caminhaoId'); }}>
            <option value="">Selecione o caminhão</option>
            {caminhoes.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.modelo} ({c.placa})</option>)}
          </select>
        </Field>
        <Field label="Motorista" required error={errors.motoristaId}>
          <select className={`${selectCls} ${errors.motoristaId ? 'border-red-400' : ''}`} value={form.motoristaId} onChange={(e) => { setForm({ ...form, motoristaId: e.target.value }); clearError('motoristaId'); }}>
            <option value="">Selecione o motorista</option>
            {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
        <Field label="Combustível" required>
          <select className={selectCls} value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })}>
            {combustivelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Posto" required error={errors.posto}>
          <input className={`${inputCls} ${errors.posto ? 'border-red-400' : ''}`} value={form.posto} onChange={(e) => { setForm({ ...form, posto: e.target.value }); clearError('posto'); }} onBlur={() => validateField('posto', form)} placeholder="Nome do posto" />
        </Field>
        <Field label="Litros abastecidos" required error={errors.litros}>
          <input className={`${inputCls} ${errors.litros ? 'border-red-400' : ''}`} type="number" step="0.01" min="0" value={form.litros} onChange={(e) => { setForm({ ...form, litros: e.target.value }); clearError('litros'); }} onBlur={() => validateField('litros', form)} placeholder="Ex: 350.5" />
        </Field>
        <Field label="Preço por litro (R$)" required error={errors.precoLitro}>
          <input className={`${inputCls} ${errors.precoLitro ? 'border-red-400' : ''}`} type="number" step="0.001" min="0" value={form.precoLitro} onChange={(e) => { setForm({ ...form, precoLitro: e.target.value }); clearError('precoLitro'); }} onBlur={() => validateField('precoLitro', form)} placeholder="Ex: 5.890" />
        </Field>
        <Field label="KM atual do veículo" required error={errors.kmAtual}>
          <input className={`${inputCls} ${errors.kmAtual ? 'border-red-400' : ''}`} type="number" min="0" value={form.kmAtual} onChange={(e) => { setForm({ ...form, kmAtual: e.target.value }); clearError('kmAtual'); }} onBlur={() => validateField('kmAtual', form)} placeholder="Ex: 185420" />
        </Field>
        <Field label="Data do abastecimento">
          <input className={inputCls} type="datetime-local" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Field>
      </div>
      {form.litros && form.precoLitro && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-sm text-green-700 font-medium">
            Total estimado: R$ {(Number(form.litros) * Number(form.precoLitro)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={registrar.isPending} disabled={!form.caminhaoId || !form.motoristaId} confirmLabel="Registrar" />
    </Modal>
  );
}
