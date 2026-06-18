import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useCriarEventoAgenda, useAtualizarEventoAgenda, type EventoAgenda } from '../../hooks/useApi';
import { emptyEventoForm } from './agenda.constants';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se fornecido, abre em modo edição; se null, abre em modo criação */
  editando: EventoAgenda | null;
  /** Data pré-selecionada ao criar (ignorado em modo edição) */
  dataInicial?: string;
}

export function EventoAgendaModal({ open, onClose, editando, dataInicial }: Props) {
  const [form, setForm] = useState(emptyEventoForm);

  const criar = useCriarEventoAgenda();
  const atualizar = useAtualizarEventoAgenda();

  useEffect(() => {
    if (open) {
      if (editando) {
        setForm({
          titulo:    editando.titulo,
          descricao: editando.descricao ?? editando.subtitulo ?? '',
          data:      editando.data,
          tipo:      editando.tipoEvento ?? 'lembrete',
          cor:       editando.cor,
          link:      editando.link ?? '',
        });
      } else {
        setForm({ ...emptyEventoForm, data: dataInicial ?? '' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    if (!form.titulo.trim() || !form.data) return;
    const payload = {
      titulo:    form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      data:      form.data,
      tipo:      form.tipo,
      cor:       form.cor,
      link:      form.link.trim() || undefined,
    };
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, ...payload, descricao: payload.descricao ?? null, link: payload.link ?? null });
      } else {
        await criar.mutateAsync(payload);
      }
      onClose();
    } catch { /* handled by onError */ }
  }

  const tipoOptions = [
    { value: 'lembrete', label: 'Lembrete' },
    { value: 'reuniao',  label: 'Reunião' },
    { value: 'vistoria', label: 'Vistoria' },
    { value: 'outro',    label: 'Outro' },
  ];
  const corOptions = [
    { value: 'blue',   label: 'Azul' },
    { value: 'green',  label: 'Verde' },
    { value: 'orange', label: 'Laranja' },
    { value: 'red',    label: 'Vermelho' },
    { value: 'purple', label: 'Roxo' },
    { value: 'gray',   label: 'Cinza' },
  ];

  const isPending = criar.isPending || atualizar.isPending;

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Evento' : 'Novo Evento na Agenda'} size="sm">
      <div className="space-y-4">
        <Field label="Título" required>
          <input className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Reunião de frota" />
        </Field>
        <Field label="Data" required>
          <input className={inputCls} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <select className={selectCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {tipoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Cor">
            <select className={selectCls} value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })}>
              {corOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descrição">
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes opcionais..." />
        </Field>
        <Field label="Link (opcional)">
          <input className={inputCls} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={isPending} disabled={!form.titulo.trim() || !form.data} confirmLabel={editando ? 'Salvar' : 'Criar evento'} />
    </Modal>
  );
}
