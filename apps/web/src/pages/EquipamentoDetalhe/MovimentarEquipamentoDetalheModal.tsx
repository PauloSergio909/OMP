import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useMovimentarEquipamento, useFuncionarios } from '../../hooks/useApi';
import { emptyMovForm } from './equipamento-detalhe.constants';

interface Props {
  equipamentoId: string | null;
  onClose: () => void;
}

export function MovimentarEquipamentoDetalheModal({ equipamentoId, onClose }: Props) {
  const [form, setForm] = useState(emptyMovForm);
  const [descartePendente, setDescartePendente] = useState(false);

  const movimentar = useMovimentarEquipamento();
  const { data: funcData } = useFuncionarios(1, '', undefined, true, 200);
  const funcionarios = funcData?.data ?? [];

  useEffect(() => {
    if (equipamentoId) {
      setForm(emptyMovForm);
      setDescartePendente(false);
    }
  }, [equipamentoId]);

  async function registrar() {
    if (!equipamentoId || !form.responsavelId) return;
    if (form.novoStatus === 'descartado' && !descartePendente) {
      setDescartePendente(true);
      return;
    }
    try {
      await movimentar.mutateAsync({
        id:            equipamentoId,
        tipo:          form.tipo,
        responsavelId: form.responsavelId,
        destino:       form.destino || undefined,
        observacoes:   form.observacoes || undefined,
        novoStatus:    form.novoStatus || undefined,
      });
      onClose();
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={!!equipamentoId} onClose={() => { onClose(); setDescartePendente(false); }} title="Registrar Movimentação" size="md">
      <div className="space-y-4">
        <Field label="Tipo de movimentação" required>
          <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="retirada">Retirada</option>
            <option value="devolucao">Devolução</option>
            <option value="manutencao">Manutenção</option>
            <option value="descarte">Descarte</option>
          </select>
        </Field>
        <Field label="Responsável" required>
          <select className={selectCls} value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
            <option value="">Selecione o responsável</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
          </select>
        </Field>
        <Field label="Novo status após movimentação">
          <select className={selectCls} value={form.novoStatus} onChange={(e) => setForm({ ...form, novoStatus: e.target.value })}>
            <option value="">Não alterar</option>
            <option value="disponivel">Disponível</option>
            <option value="em_uso">Em uso</option>
            <option value="manutencao">Manutenção</option>
            <option value="descartado">Descartado</option>
          </select>
        </Field>
        <Field label="Destino / Local">
          <input className={inputCls} value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ex: Obra A, Galpão 3..." />
        </Field>
        <Field label="Observações">
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </Field>
      </div>
      {descartePendente && form.novoStatus === 'descartado' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
          <span className="text-sm text-red-700">Esta ação é <strong>irreversível</strong>. O item será marcado como descartado permanentemente. Clique em "Confirmar Descarte" para prosseguir.</span>
        </div>
      )}
      <ModalFooter
        onCancel={() => { onClose(); setDescartePendente(false); }}
        onConfirm={registrar}
        loading={movimentar.isPending}
        disabled={!form.responsavelId}
        confirmLabel={descartePendente && form.novoStatus === 'descartado' ? 'Confirmar Descarte' : 'Registrar'}
      />
    </Modal>
  );
}
