import { useState } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, combine, matches, exactLength, inRange } from '../../hooks/useFormValidation';
import { useCriarCaminhao, useMotoristasDisponiveis } from '../../hooks/useApi';

const emptyForm = {
  placa: '', chassi: '', modelo: '', fabricante: '',
  anoFabricacao: String(new Date().getFullYear()),
  kmAtual: '0', motoristaId: '', proximaManutencao: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NovoCaminhaoModal({ open, onClose }: Props) {
  const [form, setForm] = useState(emptyForm);
  const { data: motoristas } = useMotoristasDisponiveis();
  const criar = useCriarCaminhao();

  const { errors, validate, clearAll, validateField, clearError } = useFormValidation<typeof emptyForm>({
    placa:         combine(required('Placa'), matches(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/, 'Placa inválida. Use ABC-1234 ou ABC1D23')),
    chassi:        combine(required('Chassi'), exactLength(17, 'Chassi deve ter exatamente 17 caracteres')),
    modelo:        required('Modelo'),
    fabricante:    required('Fabricante'),
    anoFabricacao: combine(required('Ano'), inRange(1990, new Date().getFullYear() + 1, 'Ano de fabricação')),
  });

  function fechar() { onClose(); setForm(emptyForm); clearAll(); }

  async function salvar() {
    if (!validate(form)) return;
    try {
      await criar.mutateAsync({
        ...form,
        anoFabricacao: Number(form.anoFabricacao),
        kmAtual: Number(form.kmAtual),
        motoristaId: form.motoristaId || null,
        proximaManutencao: form.proximaManutencao || null,
      });
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Novo Caminhão" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Placa" required error={errors.placa}>
          <input className={`${inputCls} ${errors.placa ? 'border-red-400' : ''}`} value={form.placa} onChange={(e) => { setForm({ ...form, placa: e.target.value.toUpperCase() }); clearError('placa'); }} onBlur={() => validateField('placa', form)} placeholder="ABC1D23" maxLength={8} />
        </Field>
        <Field label="Chassi (17 caracteres)" required error={errors.chassi}>
          <input className={`${inputCls} ${errors.chassi ? 'border-red-400' : ''}`} value={form.chassi} onChange={(e) => { setForm({ ...form, chassi: e.target.value.toUpperCase() }); clearError('chassi'); }} onBlur={() => validateField('chassi', form)} placeholder="9BM3285L0MB123456" maxLength={17} />
        </Field>
        <Field label="Fabricante" required error={errors.fabricante}>
          <input className={`${inputCls} ${errors.fabricante ? 'border-red-400' : ''}`} value={form.fabricante} onChange={(e) => { setForm({ ...form, fabricante: e.target.value }); clearError('fabricante'); }} onBlur={() => validateField('fabricante', form)} placeholder="Ex: Volvo, Scania, Mercedes-Benz" />
        </Field>
        <Field label="Modelo" required error={errors.modelo}>
          <input className={`${inputCls} ${errors.modelo ? 'border-red-400' : ''}`} value={form.modelo} onChange={(e) => { setForm({ ...form, modelo: e.target.value }); clearError('modelo'); }} onBlur={() => validateField('modelo', form)} placeholder="Ex: FH 540, R450" />
        </Field>
        <Field label="Ano de Fabricação" required error={errors.anoFabricacao}>
          <input className={inputCls} type="number" min="1990" max={new Date().getFullYear() + 1} value={form.anoFabricacao} onChange={(e) => { setForm({ ...form, anoFabricacao: e.target.value }); clearError('anoFabricacao'); }} onBlur={() => validateField('anoFabricacao', form)} />
        </Field>
        <Field label="KM Atual" required>
          <input className={inputCls} type="number" min="0" max="9999999" value={form.kmAtual} onChange={(e) => setForm({ ...form, kmAtual: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Motorista">
          <select className={selectCls} value={form.motoristaId} onChange={(e) => setForm({ ...form, motoristaId: e.target.value })}>
            <option value="">Sem motorista</option>
            {(motoristas ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome} {m.cnhCategoria ? `— CNH ${m.cnhCategoria}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Próxima Manutenção">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaManutencao} onChange={(e) => setForm({ ...form, proximaManutencao: e.target.value })} />
        </Field>
      </div>
      <ModalFooter onCancel={fechar} onConfirm={salvar} loading={criar.isPending} disabled={!form.placa || !form.chassi || !form.modelo || !form.fabricante || !form.anoFabricacao} confirmLabel="Cadastrar" />
    </Modal>
  );
}
