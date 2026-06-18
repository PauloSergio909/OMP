import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useFormValidation, required } from '../../hooks/useFormValidation';
import { useMovimentarEquipamento, useFuncionarios, type FuncionarioListItem } from '../../hooks/useApi';
import { emptyMov } from './equipamentos.constants';

interface Props {
  equipamentoId: string | null;
  onClose: () => void;
}

export function MovimentarEquipamentoModal({ equipamentoId, onClose }: Props) {
  const [form, setForm] = useState(emptyMov);
  const [descartePendente, setDescartePendente] = useState(false);
  const { errors, validate, clearAll, clearError } =
    useFormValidation<typeof emptyMov>({ responsavelId: required('Responsável') });
  const movimentar = useMovimentarEquipamento();
  const { data: funcList } = useFuncionarios(1, '', undefined, undefined, 200);
  const funcionarios: FuncionarioListItem[] = funcList?.data ?? [];

  useEffect(() => {
    if (equipamentoId) { setForm(emptyMov); setDescartePendente(false); clearAll(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipamentoId]);

  async function salvar() {
    if (!equipamentoId || !validate(form)) return;
    if (form.novoStatus === 'descartado' && !descartePendente) {
      setDescartePendente(true);
      return;
    }
    try {
      await movimentar.mutateAsync({
        id: equipamentoId,
        ...form,
        novoStatus: form.novoStatus || undefined,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  function fechar() { setDescartePendente(false); onClose(); }

  return (
    <Modal open={!!equipamentoId} onClose={fechar} title="Registrar Movimentação" size="md">
      <div className="space-y-4">
        <Field label="Tipo de movimentação" required>
          <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="retirada">Retirada (em uso)</option>
            <option value="devolucao">Devolução</option>
            <option value="manutencao">Envio para manutenção</option>
            <option value="descarte">Descarte</option>
          </select>
        </Field>
        <Field label="Responsável" required error={errors.responsavelId}>
          <select
            className={`${selectCls} ${errors.responsavelId ? 'border-red-400' : ''}`}
            value={form.responsavelId}
            onChange={(e) => { setForm({ ...form, responsavelId: e.target.value }); clearError('responsavelId'); }}
          >
            <option value="">Selecione o responsável</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
            ))}
          </select>
        </Field>
        <Field label="Destino / Local">
          <input className={inputCls} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ex: Oficina, Obra SP-01" />
        </Field>
        <Field label="Novo status do item">
          <select
            className={selectCls}
            value={form.novoStatus}
            onChange={(e) => { setForm({ ...form, novoStatus: e.target.value }); setDescartePendente(false); }}
          >
            <option value="">Manter status atual</option>
            <option value="disponivel">Disponível</option>
            <option value="em_uso">Em Uso</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="descartado">Descartado</option>
          </select>
        </Field>
        <Field label="Observações">
          <input className={inputCls} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Motivo ou detalhes" />
        </Field>
        {descartePendente && form.novoStatus === 'descartado' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Esta ação é <strong>irreversível</strong>. O item será marcado como descartado permanentemente. Clique em "Confirmar Descarte" para prosseguir.</span>
          </div>
        )}
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={movimentar.isPending}
        disabled={!form.responsavelId}
        confirmLabel={descartePendente && form.novoStatus === 'descartado' ? 'Confirmar Descarte' : 'Registrar'}
      />
    </Modal>
  );
}
