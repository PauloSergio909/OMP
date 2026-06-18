import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required, minLength, combine, isNotPastDate } from '../../hooks/useFormValidation';
import { useCriarOS, useCaminhoes, useFuncionarios } from '../../hooks/useApi';
import { emptyOS } from './os.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  initialCaminhaoId?: string;
}

export function NovaOsModal({ open, onClose, initialCaminhaoId }: Props) {
  const [form, setForm] = useState({ ...emptyOS, caminhaoId: initialCaminhaoId ?? '' });

  const { data: caminhoesList } = useCaminhoes(1, undefined, undefined, 200);
  const { data: funcList } = useFuncionarios(1, '', undefined, undefined, 200);
  const criarOS = useCriarOS();

  const caminhoes = caminhoesList?.data ?? [];
  const mecanicos = funcList?.data ?? [];

  const { errors, validate, clearAll, validateField, clearError } = useFormValidation<typeof emptyOS>({
    caminhaoId:    required('Caminhão'),
    responsavelId: required('Responsável'),
    descricao:     combine(required('Descrição'), minLength(10, 'Descrição')),
    dataPrevisao:  combine(required('Data de previsão'), isNotPastDate('Data de previsão')),
  });

  useEffect(() => {
    if (open) {
      setForm({ ...emptyOS, caminhaoId: initialCaminhaoId ?? '' });
      clearAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fechar() { onClose(); }

  async function salvar() {
    if (!validate(form)) return;
    try {
      await criarOS.mutateAsync(form);
      fechar();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Nova Ordem de Serviço" size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Caminhão" required error={errors.caminhaoId}>
          <select
            className={`${selectCls} ${errors.caminhaoId ? 'border-red-400' : ''}`}
            value={form.caminhaoId}
            onChange={(e) => { setForm({ ...form, caminhaoId: e.target.value }); clearError('caminhaoId'); }}
          >
            <option value="">Selecione o caminhão</option>
            {caminhoes.map((c) => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.modelo} ({c.placa})</option>
            ))}
          </select>
        </Field>
        <Field label="Responsável (Mecânico)" required error={errors.responsavelId}>
          <select
            className={`${selectCls} ${errors.responsavelId ? 'border-red-400' : ''}`}
            value={form.responsavelId}
            onChange={(e) => { setForm({ ...form, responsavelId: e.target.value }); clearError('responsavelId'); }}
          >
            <option value="">Selecione o responsável</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo" required>
          <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
          </select>
        </Field>
        <Field label="Prioridade" required>
          <select className={selectCls} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </Field>
        <Field label="Data de Previsão" required error={errors.dataPrevisao}>
          <input
            className={`${inputCls} ${errors.dataPrevisao ? 'border-red-400' : ''}`}
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={form.dataPrevisao}
            onChange={(e) => { setForm({ ...form, dataPrevisao: e.target.value }); clearError('dataPrevisao'); }}
            onBlur={() => validateField('dataPrevisao', form)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descrição do serviço" required error={errors.descricao}>
            <textarea
              className={`${inputCls} resize-none ${errors.descricao ? 'border-red-400' : ''}`}
              rows={3}
              value={form.descricao}
              onChange={(e) => { setForm({ ...form, descricao: e.target.value }); clearError('descricao'); }}
              onBlur={() => validateField('descricao', form)}
              placeholder="Descreva o serviço a ser realizado (mínimo 10 caracteres)..."
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações adicionais..."
            />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <input
          type="checkbox"
          id="criarComoOrcamento"
          checked={form.criarComoOrcamento}
          onChange={(e) => setForm({ ...form, criarComoOrcamento: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
        />
        <label htmlFor="criarComoOrcamento" className="text-sm text-gray-700 cursor-pointer select-none">
          Criar como <strong>Orçamento</strong> — aguarda aprovação antes de iniciar
        </label>
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={criarOS.isPending}
        disabled={!form.caminhaoId || !form.responsavelId || !form.dataPrevisao || !form.descricao}
        confirmLabel={form.criarComoOrcamento ? 'Criar Orçamento' : 'Abrir OS'}
      />
    </Modal>
  );
}
