import { useState, useEffect } from 'react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useItensPadraoChecklist, useCriarChecklist } from '../../hooks/useApi';

interface Props {
  /** null = fechado; string = caminhaoId */
  caminhaoId: string | null;
  funcionarioId: string;
  kmAtualInicial: string;
  onClose: () => void;
}

export function NovaVistoriaModal({ caminhaoId, funcionarioId, kmAtualInicial, onClose }: Props) {
  const { data: itensPadrao = [] } = useItensPadraoChecklist();
  const criarChecklist = useCriarChecklist();

  const [tipo, setTipo] = useState<'pre_viagem' | 'pos_viagem'>('pre_viagem');
  const [km, setKm] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<{ item: string; ok: boolean; observacoes: string }[]>([]);

  useEffect(() => {
    if (caminhaoId) {
      setTipo('pre_viagem');
      setKm(kmAtualInicial);
      setObservacoes('');
      setItens(itensPadrao.map((item) => ({ item, ok: true, observacoes: '' })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminhaoId]);

  async function salvar() {
    if (!caminhaoId || !km) return;
    try {
      await criarChecklist.mutateAsync({
        caminhaoId,
        motoristaId: funcionarioId,
        kmAtual: Number(km),
        tipo,
        observacoes: observacoes || undefined,
        itens: itens.map((i) => ({ item: i.item, ok: i.ok, observacoes: i.observacoes || undefined })),
      });
      onClose();
    } catch { /* handled by onError */ }
  }

  function toggleItem(idx: number) {
    setItens(itens.map((it, i) => i === idx ? { ...it, ok: !it.ok } : it));
  }

  function setItemObs(idx: number, obs: string) {
    setItens(itens.map((it, i) => i === idx ? { ...it, observacoes: obs } : it));
  }

  const okCount = itens.filter((i) => i.ok).length;
  const nokCount = itens.length - okCount;

  return (
    <Modal open={!!caminhaoId} onClose={onClose} title="Nova Vistoria" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" required>
            <select className={selectCls} value={tipo} onChange={(e) => setTipo(e.target.value as 'pre_viagem' | 'pos_viagem')}>
              <option value="pre_viagem">Pré-viagem</option>
              <option value="pos_viagem">Pós-viagem</option>
            </select>
          </Field>
          <Field label="KM Atual" required>
            <input className={inputCls} type="number" min="0" value={km} onChange={(e) => setKm(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Itens de verificação</p>
          <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-3">
            {itens.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg ${item.ok ? 'bg-gray-50' : 'bg-red-50 border border-red-100'}`}>
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${item.ok ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-red-400 text-red-500'}`}
                >
                  {item.ok ? <span className="text-xs">✓</span> : <span className="text-xs">✗</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{item.item}</p>
                  {!item.ok && (
                    <input
                      className={`${inputCls} mt-1.5 text-xs py-1`}
                      placeholder="Descreva o problema..."
                      value={item.observacoes}
                      onChange={(e) => setItemObs(idx, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {okCount}/{itens.length} itens OK
            {nokCount > 0 && <span className="text-red-600 font-medium ml-1">· {nokCount} com problema</span>}
          </p>
        </div>

        <Field label="Observações gerais">
          <textarea className={`${inputCls} resize-none`} rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Informações adicionais..." />
        </Field>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={salvar}
        loading={criarChecklist.isPending}
        disabled={!km}
        confirmLabel="Salvar Vistoria"
      />
    </Modal>
  );
}
