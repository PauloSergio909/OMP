import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, inRange } from '../../hooks/useFormValidation';
import { useCriarEquipamento } from '../../hooks/useApi';
import { emptyForm } from './equipamentos.constants';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NovoEquipamentoModal({ open, onClose }: Props) {
  const [form, setForm] = useState(emptyForm);
  const { errors, validate, clearAll, validateField, clearError } =
    useFormValidation<typeof emptyForm>({
      nome:           required('Nome'),
      valorAquisicao: inRange(0, 9_999_999, 'Valor de aquisição'),
    });
  const criar = useCriarEquipamento();

  useEffect(() => {
    if (open) { setForm(emptyForm); clearAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!validate(form)) return;
    try {
      await criar.mutateAsync({
        ...form,
        valorAquisicao: form.valorAquisicao ? Number(form.valorAquisicao) : undefined,
        dataAquisicao: form.dataAquisicao || undefined,
        proximaRevisao: form.proximaRevisao || undefined,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Item (Equipamento / Ferramenta)" size="xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome" required error={errors.nome}>
          <input
            className={`${inputCls} ${errors.nome ? 'border-red-400' : ''}`}
            value={form.nome}
            onChange={(e) => { setForm({ ...form, nome: e.target.value }); clearError('nome'); }}
            placeholder="Ex: Guincho Hidráulico 5T"
          />
        </Field>
        <Field label="Tipo" required>
          <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="ferramenta">Ferramenta</option>
            <option value="equipamento">Equipamento</option>
            <option value="veiculo_apoio">Veículo de Apoio</option>
          </select>
        </Field>
        <Field label="Fabricante">
          <input className={inputCls} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} placeholder="Ex: Bosch, Makita" />
        </Field>
        <Field label="Modelo">
          <input className={inputCls} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ex: GBH 2-26 DFR" />
        </Field>
        <Field label="Número de Série">
          <input className={inputCls} value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} placeholder="Nº de série do fabricante" />
        </Field>
        <Field label="Localização">
          <input className={inputCls} value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão A, Prateleira 3" />
        </Field>
        <Field label="Data de Aquisição">
          <input className={inputCls} type="date" value={form.dataAquisicao} onChange={(e) => setForm({ ...form, dataAquisicao: e.target.value })} />
        </Field>
        <Field label="Valor de Aquisição (R$)" error={errors.valorAquisicao}>
          <input
            className={`${inputCls} ${errors.valorAquisicao ? 'border-red-400' : ''}`}
            type="number" step="0.01" min="0" max="9999999.99"
            value={form.valorAquisicao}
            onChange={(e) => { setForm({ ...form, valorAquisicao: e.target.value }); clearError('valorAquisicao'); }}
            onBlur={() => validateField('valorAquisicao', form)}
            placeholder="0,00"
          />
        </Field>
        <Field label="Próxima Revisão">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaRevisao} onChange={(e) => setForm({ ...form, proximaRevisao: e.target.value })} />
        </Field>
        <Field label="Descrição">
          <input className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do item" />
        </Field>
        <Field label="Observações">
          <input className={inputCls} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações adicionais" />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={criar.isPending} disabled={!form.nome} confirmLabel="Cadastrar" />
    </Modal>
  );
}
