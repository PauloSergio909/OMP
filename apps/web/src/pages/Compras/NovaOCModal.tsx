import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Modal, Field, ModalFooter, inputCls, selectCls } from '../../components/ui/Modal';
import { useCriarCompra, useFornecedores, useMateriais } from '../../hooks/useApi';

const emptyItem = { materialId: '', quantidade: '', precoUnitario: '' };

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NovaOCModal({ open, onClose }: Props) {
  const [fornecedorId, setFornecedorId] = useState('');
  const [dataEntrega, setDataEntrega]   = useState('');
  const [observacoes, setObservacoes]   = useState('');
  const [itens, setItens]               = useState([{ ...emptyItem }]);
  const [avisoItens, setAvisoItens]     = useState(0);

  const criarCompra = useCriarCompra();
  const { data: fornecedores = [] }  = useFornecedores();
  const { data: materiaisData }      = useMateriais(1, '', undefined, 200);
  const materiais = materiaisData?.data ?? [];

  const totalItens = itens.reduce(
    (sum, i) => sum + (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0), 0,
  );

  useEffect(() => {
    if (open) {
      setFornecedorId(''); setDataEntrega(''); setObservacoes('');
      setItens([{ ...emptyItem }]); setAvisoItens(0);
    }
  }, [open]);

  function addItem() { setItens([...itens, { ...emptyItem }]); }
  function removeItem(idx: number) { setItens(itens.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: string, value: string) {
    setItens(itens.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function salvar() {
    if (!fornecedorId) { toast.error('Selecione um fornecedor'); return; }
    const validItens = itens.filter((i) => i.materialId && i.quantidade && i.precoUnitario);
    if (validItens.length === 0) {
      toast.error('Adicione pelo menos um item com material, quantidade e preço preenchidos');
      return;
    }
    const ignorados = itens.length - validItens.length;
    if (ignorados > 0 && avisoItens === 0) { setAvisoItens(ignorados); return; }
    try {
      await criarCompra.mutateAsync({
        fornecedorId,
        dataEntrega:  dataEntrega || undefined,
        observacoes:  observacoes.trim() || undefined,
        itens: validItens.map((i) => ({
          materialId:    i.materialId,
          quantidade:    Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
        })),
      });
      onClose();
    } catch { /* handled by onError in hook */ }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Ordem de Compra" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fornecedor" required>
            <select className={selectCls} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione o fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razaoSocial}{(f.avaliacao ?? 0) > 0 ? ` ${'★'.repeat(f.avaliacao!)}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Previsão de Entrega">
            <input type="date" className={inputCls} min={new Date().toISOString().slice(0, 10)} value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Itens</span>
            <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={13} /> Adicionar item
            </button>
          </div>
          <div className="space-y-2.5">
            {itens.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <select className={selectCls} value={item.materialId} onChange={(e) => {
                    const mat = materiais.find((m) => m.id === e.target.value);
                    const newItems = [...itens];
                    newItems[idx] = { ...newItems[idx], materialId: e.target.value, precoUnitario: mat ? String(mat.precoUnitario) : newItems[idx].precoUnitario };
                    setItens(newItems);
                  }}>
                    <option value="">Material</option>
                    {materiais.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="number" min="1" max="1000000" className={inputCls} placeholder="Qtd" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <input type="number" min="0" max="9999999.99" step="0.01" className={inputCls} placeholder="R$/un" value={item.precoUnitario} onChange={(e) => updateItem(idx, 'precoUnitario', e.target.value)} />
                </div>
                <div className="col-span-1 flex justify-center">
                  {itens.length > 1 && (
                    <button onClick={() => removeItem(idx)} aria-label="Remover item" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {totalItens > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
              <span className="text-sm text-blue-700">Total da OC:</span>
              <span className="text-sm font-bold text-blue-800">R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <Field label="Observações">
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Informações adicionais para o fornecedor..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>
      </div>

      {avisoItens > 0 && (
        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{avisoItens} {avisoItens === 1 ? 'item incompleto será ignorado' : 'itens incompletos serão ignorados'}.</span>{' '}
            Clique em "Criar OC" novamente para confirmar ou complete os itens antes de salvar.
          </p>
        </div>
      )}
      <ModalFooter onCancel={onClose} onConfirm={salvar} loading={criarCompra.isPending} disabled={!fornecedorId} confirmLabel="Criar OC" />
    </Modal>
  );
}
