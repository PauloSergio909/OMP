import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useAtualizarEquipamento } from '../../hooks/useApi';
import { emptyEdit } from './equipamentos.constants';

export interface EquipamentoEditTarget {
  id: string;
  nome: string;
  status: string;
  localizacao?: string | null;
  proximaRevisao?: string | null;
  observacoes?: string | null;
}

interface Props {
  equipamento: EquipamentoEditTarget | null;
  onClose: () => void;
}

export function EditarEquipamentoModal({ equipamento, onClose }: Props) {
  const [form, setForm] = useState(emptyEdit);
  const [descartePendente, setDescartePendente] = useState(false);
  const atualizar = useAtualizarEquipamento();

  useEffect(() => {
    if (equipamento) {
      setForm({
        nome: equipamento.nome,
        status: equipamento.status,
        localizacao: equipamento.localizacao ?? '',
        proximaRevisao: equipamento.proximaRevisao ? equipamento.proximaRevisao.slice(0, 10) : '',
        observacoes: equipamento.observacoes ?? '',
      });
      setDescartePendente(false);
    }
  }, [equipamento]);

  async function salvar() {
    if (!equipamento) return;
    if (form.status === 'descartado' && equipamento.status !== 'descartado' && !descartePendente) {
      setDescartePendente(true);
      return;
    }
    try {
      await atualizar.mutateAsync({
        id: equipamento.id,
        nome: form.nome || undefined,
        status: form.status || undefined,
        localizacao: form.localizacao || null,
        proximaRevisao: form.proximaRevisao || null,
        observacoes: form.observacoes || null,
      });
      setDescartePendente(false);
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  function fechar() { setDescartePendente(false); onClose(); }

  return (
    <Modal open={!!equipamento} onClose={fechar} title="Editar Equipamento" size="md">
      <div className="space-y-4">
        <Field label="Nome">
          <input
            className={inputCls}
            value={form.nome}
            onChange={(e) => { setForm({ ...form, nome: e.target.value }); setDescartePendente(false); }}
          />
        </Field>
        <Field label="Status">
          <select
            className={selectCls}
            value={form.status}
            onChange={(e) => { setForm({ ...form, status: e.target.value }); setDescartePendente(false); }}
          >
            <option value="disponivel">Disponível</option>
            <option value="em_uso">Em Uso</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="descartado">Descartado</option>
          </select>
        </Field>
        <Field label="Localização">
          <input className={inputCls} value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão A" />
        </Field>
        <Field label="Próxima Revisão">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaRevisao} onChange={(e) => setForm({ ...form, proximaRevisao: e.target.value })} />
        </Field>
        <Field label="Observações">
          <input className={inputCls} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações" />
        </Field>
        {descartePendente && form.status === 'descartado' && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Esta ação é <strong>irreversível</strong>. O item será marcado como descartado permanentemente. Clique em "Confirmar Descarte" para prosseguir.</span>
          </div>
        )}
      </div>
      <ModalFooter
        onCancel={fechar}
        onConfirm={salvar}
        loading={atualizar.isPending}
        disabled={!form.nome}
        confirmLabel={descartePendente && form.status === 'descartado' ? 'Confirmar Descarte' : 'Salvar'}
      />
    </Modal>
  );
}
