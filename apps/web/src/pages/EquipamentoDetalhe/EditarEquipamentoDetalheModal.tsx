import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useAtualizarEquipamento, useFuncionarios, type EquipamentoDetalhe } from '../../hooks/useApi';
import { emptyEditForm } from './equipamento-detalhe.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  equipamento: EquipamentoDetalhe;
}

export function EditarEquipamentoDetalheModal({ open, onClose, equipamento }: Props) {
  const [form, setForm] = useState(emptyEditForm);
  const [descartePendente, setDescartePendente] = useState(false);

  const atualizar = useAtualizarEquipamento();
  const { data: funcData } = useFuncionarios(1, '', undefined, true, 200);
  const funcionarios = funcData?.data ?? [];

  useEffect(() => {
    if (open) {
      setForm({
        nome:           equipamento.nome,
        status:         equipamento.status,
        localizacao:    equipamento.localizacao ?? '',
        proximaRevisao: equipamento.proximaRevisao ? equipamento.proximaRevisao.slice(0, 10) : '',
        observacoes:    equipamento.observacoes ?? '',
        responsavelId:  equipamento.responsavel?.id ?? '',
      });
      setDescartePendente(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (form.status === 'descartado' && equipamento.status !== 'descartado' && !descartePendente) {
      setDescartePendente(true);
      return;
    }
    try {
      await atualizar.mutateAsync({
        id:             equipamento.id,
        nome:           form.nome || undefined,
        status:         form.status || undefined,
        localizacao:    form.localizacao || null,
        proximaRevisao: form.proximaRevisao || null,
        observacoes:    form.observacoes || null,
        responsavelId:  form.responsavelId || null,
      });
      onClose();
      setDescartePendente(false);
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setDescartePendente(false); }} title={`Editar — ${equipamento.nome}`} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome">
          <input className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="">Manter atual</option>
            <option value="disponivel">Disponível</option>
            <option value="em_uso">Em uso</option>
            <option value="manutencao">Manutenção</option>
            <option value="descartado">Descartado</option>
          </select>
        </Field>
        <Field label="Localização">
          <input className={inputCls} value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão 2 — Prateleira B" />
        </Field>
        <Field label="Próxima Revisão">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaRevisao} onChange={(e) => setForm({ ...form, proximaRevisao: e.target.value })} />
        </Field>
        <Field label="Responsável">
          <select className={selectCls} value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
            <option value="">Sem responsável</option>
            {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
        </div>
      </div>
      {descartePendente && form.status === 'descartado' && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
          <span className="text-sm text-red-700">Esta ação é <strong>irreversível</strong>. O item será marcado como descartado permanentemente. Clique em "Confirmar Descarte" para prosseguir.</span>
        </div>
      )}
      <ModalFooter
        onCancel={() => { onClose(); setDescartePendente(false); }}
        onConfirm={salvar}
        loading={atualizar.isPending}
        disabled={!form.nome}
        confirmLabel={descartePendente && form.status === 'descartado' ? 'Confirmar Descarte' : 'Salvar'}
      />
    </Modal>
  );
}
