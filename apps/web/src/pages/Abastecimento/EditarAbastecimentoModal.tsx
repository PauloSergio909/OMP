import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, isPositive } from '../../hooks/useFormValidation';
import { useAtualizarAbastecimento, useFuncionarios, type AbastecimentoListItem } from '../../hooks/useApi';
import { emptyForm, combustivelOptions } from './abastecimento.constants';

interface Props {
  abastecimento: AbastecimentoListItem | null;
  onClose: () => void;
}

export function EditarAbastecimentoModal({ abastecimento: ab, onClose }: Props) {
  const [form, setForm] = useState(emptyForm);

  const atualizar = useAtualizarAbastecimento();
  const { data: funcList } = useFuncionarios(1, '', 'motorista', undefined, 200);
  const motoristas = funcList?.data ?? [];

  const { errors, validate, clearAll, clearError } = useFormValidation<typeof emptyForm>({
    litros:     isPositive('Litros'),
    precoLitro: isPositive('Preço por litro'),
    kmAtual:    isPositive('KM atual'),
  });

  useEffect(() => {
    if (ab) {
      setForm({
        caminhaoId:  ab.caminhao?.id ?? '',
        motoristaId: ab.motorista?.id ?? '',
        litros:      String(ab.litros),
        precoLitro:  String(ab.precoLitro),
        kmAtual:     String(ab.kmAtual),
        combustivel: ab.combustivel ?? 'diesel',
        posto:       ab.posto ?? '',
        data:        ab.data ? new Date(ab.data).toISOString().slice(0, 16) : '',
      });
    } else {
      setForm(emptyForm);
      clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ab]);

  async function salvar() {
    if (!ab) return;
    if (!validate(form)) return;
    try {
      await atualizar.mutateAsync({
        id:          ab.id,
        motoristaId: form.motoristaId || undefined,
        litros:      form.litros     ? Number(form.litros)     : undefined,
        precoLitro:  form.precoLitro ? Number(form.precoLitro) : undefined,
        kmAtual:     form.kmAtual    ? Number(form.kmAtual)    : undefined,
        combustivel: form.combustivel || undefined,
        posto:       form.posto || undefined,
        data:        form.data || undefined,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={!!ab} onClose={onClose} title="Editar Abastecimento" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Motorista">
          <select className={selectCls} value={form.motoristaId} onChange={(e) => setForm({ ...form, motoristaId: e.target.value })}>
            <option value="">Selecione o motorista</option>
            {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
        <Field label="Combustível">
          <select className={selectCls} value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })}>
            {combustivelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Posto">
          <input className={inputCls} value={form.posto} onChange={(e) => setForm({ ...form, posto: e.target.value })} placeholder="Nome do posto" />
        </Field>
        <Field label="Data do abastecimento">
          <input className={inputCls} type="datetime-local" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Field>
        <Field label="Litros abastecidos" error={errors.litros}>
          <input className={`${inputCls} ${errors.litros ? 'border-red-400' : ''}`} type="number" step="0.01" min="0" value={form.litros} onChange={(e) => { setForm({ ...form, litros: e.target.value }); clearError('litros'); }} placeholder="Ex: 350.5" />
        </Field>
        <Field label="Preço por litro (R$)" error={errors.precoLitro}>
          <input className={`${inputCls} ${errors.precoLitro ? 'border-red-400' : ''}`} type="number" step="0.001" min="0" value={form.precoLitro} onChange={(e) => { setForm({ ...form, precoLitro: e.target.value }); clearError('precoLitro'); }} placeholder="Ex: 5.890" />
        </Field>
        <Field label="KM atual do veículo" error={errors.kmAtual}>
          <input className={`${inputCls} ${errors.kmAtual ? 'border-red-400' : ''}`} type="number" min="0" value={form.kmAtual} onChange={(e) => { setForm({ ...form, kmAtual: e.target.value }); clearError('kmAtual'); }} placeholder="Ex: 185420" />
        </Field>
      </div>
      {form.litros && form.precoLitro && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-sm text-green-700 font-medium">
            Total estimado: R$ {(Number(form.litros) * Number(form.precoLitro)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizar.isPending} disabled={!form.litros || !form.precoLitro || !form.kmAtual} confirmLabel="Salvar" />
    </Modal>
  );
}
