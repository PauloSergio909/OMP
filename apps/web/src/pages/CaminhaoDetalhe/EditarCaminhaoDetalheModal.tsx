import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useAtualizarCaminhao, useMotoristasDisponiveis } from '../../hooks/useApi';

interface CaminhaoEditData {
  id: string;
  modelo: string;
  fabricante: string;
  status: string;
  kmAtual: number;
  motorista?: { id: string; nome: string; cnhCategoria?: string | null } | null;
  proximaManutencao?: string | null;
  proximaManutencaoKm?: number | null;
  vencimentoCrlv?: string | null;
  vencimentoSeguro?: string | null;
  numeroSeguro?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  caminhao: CaminhaoEditData;
}

const toDateStr = (v: string | null | undefined) => v ? new Date(v).toISOString().slice(0, 10) : '';

export function EditarCaminhaoDetalheModal({ open, onClose, caminhao }: Props) {
  const [form, setForm] = useState({
    modelo: '', fabricante: '', status: '',
    motoristaId: '', proximaManutencao: '', proximaManutencaoKm: '',
    vencimentoCrlv: '', vencimentoSeguro: '', numeroSeguro: '',
  });

  const { data: motoristas } = useMotoristasDisponiveis();
  const atualizar = useAtualizarCaminhao();

  useEffect(() => {
    if (open) {
      setForm({
        modelo: caminhao.modelo,
        fabricante: caminhao.fabricante,
        status: caminhao.status,
        motoristaId: caminhao.motorista?.id ?? '',
        proximaManutencao: toDateStr(caminhao.proximaManutencao),
        proximaManutencaoKm: caminhao.proximaManutencaoKm ? String(caminhao.proximaManutencaoKm) : '',
        vencimentoCrlv: toDateStr(caminhao.vencimentoCrlv),
        vencimentoSeguro: toDateStr(caminhao.vencimentoSeguro),
        numeroSeguro: caminhao.numeroSeguro ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function salvar() {
    try {
      await atualizar.mutateAsync({
        id: caminhao.id,
        modelo: form.modelo || undefined,
        fabricante: form.fabricante || undefined,
        status: form.status || undefined,
        motoristaId: form.motoristaId || null,
        proximaManutencao: form.proximaManutencao || null,
        proximaManutencaoKm: form.proximaManutencaoKm ? Number(form.proximaManutencaoKm) : null,
        vencimentoCrlv: form.vencimentoCrlv || null,
        vencimentoSeguro: form.vencimentoSeguro || null,
        numeroSeguro: form.numeroSeguro || null,
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Caminhão" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fabricante">
            <input className={inputCls} value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <input className={inputCls} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </Field>
        </div>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="operacional">Operacional</option>
            <option value="manutencao">Em Manutenção</option>
            <option value="parado">Parado</option>
          </select>
        </Field>
        <Field label="Motorista">
          <select className={selectCls} value={form.motoristaId} onChange={(e) => setForm({ ...form, motoristaId: e.target.value })}>
            <option value="">Sem motorista</option>
            {(motoristas ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome} {m.cnhCategoria ? `— CNH ${m.cnhCategoria}` : ''}</option>)}
            {caminhao.motorista && !(motoristas ?? []).find((m) => m.id === caminhao.motorista?.id) && (
              <option value={caminhao.motorista.id}>{caminhao.motorista.nome} (atual)</option>
            )}
          </select>
        </Field>
        <Field label="Próxima Manutenção (data)">
          <input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={form.proximaManutencao} onChange={(e) => setForm({ ...form, proximaManutencao: e.target.value })} />
        </Field>
        <Field label="Próxima Manutenção (km)">
          <input className={inputCls} type="number" min={caminhao.kmAtual} placeholder={`Atual: ${caminhao.kmAtual?.toLocaleString('pt-BR') ?? '—'} km`} value={form.proximaManutencaoKm} onChange={(e) => setForm({ ...form, proximaManutencaoKm: e.target.value })} />
        </Field>
        <Field label="Venc. CRLV">
          <input className={inputCls} type="date" value={form.vencimentoCrlv} onChange={(e) => setForm({ ...form, vencimentoCrlv: e.target.value })} />
        </Field>
        <Field label="Venc. Seguro">
          <input className={inputCls} type="date" value={form.vencimentoSeguro} onChange={(e) => setForm({ ...form, vencimentoSeguro: e.target.value })} />
        </Field>
        <Field label="Nº Apólice">
          <input className={inputCls} type="text" maxLength={100} placeholder="Ex: APO-2026-12345" value={form.numeroSeguro} onChange={(e) => setForm({ ...form, numeroSeguro: e.target.value })} />
        </Field>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={atualizar.isPending} confirmLabel="Salvar" />
    </Modal>
  );
}
