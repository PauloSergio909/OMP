import { useState } from 'react';
import { Upload, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Modal, Field, ModalFooter, selectCls } from '../../components/ui/Modal';
import { useImportarMateriais, useCategorias, useFornecedores } from '../../hooks/useApi';

const unidadesValidas = ['litro', 'unidade', 'jogo', 'metro', 'kg', 'par'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportarCSVModal({ open, onClose }: Props) {
  const [catId, setCatId] = useState('');
  const [fornId, setFornId] = useState('');
  const [rows, setRows] = useState<{ nome: string; unidadeMedida: string; precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number }[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ criados: number; erros: { nome: string; mensagem: string }[] } | null>(null);

  const { data: categorias = [] } = useCategorias();
  const { data: fornecedores = [] } = useFornecedores();
  const importarMateriais = useImportarMateriais();

  function fechar() { onClose(); setCatId(''); setFornId(''); setRows([]); setError(''); setResult(null); }

  function gerarTemplate() {
    const blob = new Blob(['nome,unidade,preco,minimo,maximo\nÓleo Motor 15W-40,litro,25.50,10,50\nFiltro de Ar,unidade,35.00,5,20'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'template-materiais.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? '';
      const lines = text.trim().split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) { setError('O arquivo CSV deve ter cabeçalho e ao menos 1 linha de dados.'); return; }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["\r]/g, ''));
      const idxNome    = headers.findIndex((h) => h === 'nome');
      const idxUnidade = headers.findIndex((h) => ['unidade', 'unidademedida', 'unidade_medida'].includes(h));
      const idxPreco   = headers.findIndex((h) => ['preco', 'preco_unitario', 'precounitario'].includes(h));
      const idxMin     = headers.findIndex((h) => ['minimo', 'estoque_minimo', 'estoqueminimo'].includes(h));
      const idxMax     = headers.findIndex((h) => ['maximo', 'estoque_maximo', 'estoquemaximo'].includes(h));
      if (idxNome === -1 || idxPreco === -1 || idxMin === -1 || idxMax === -1) {
        setError('Colunas obrigatórias não encontradas. Verifique se o CSV tem: nome, preco, minimo, maximo.'); return;
      }
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/["\r]/g, ''));
        const unidade = idxUnidade >= 0 ? cols[idxUnidade] : 'unidade';
        return {
          nome: cols[idxNome] ?? '',
          unidadeMedida: unidadesValidas.includes(unidade) ? unidade : 'unidade',
          precoUnitario: parseFloat(cols[idxPreco] ?? '0') || 0,
          estoqueMinimo: parseInt(cols[idxMin] ?? '0', 10) || 0,
          estoqueMaximo: parseInt(cols[idxMax] ?? '0', 10) || 0,
        };
      }).filter((r) => r.nome && r.precoUnitario > 0 && r.estoqueMaximo > 0);
      if (parsed.length === 0) { setError('Nenhuma linha válida encontrada no CSV.'); return; }
      setRows(parsed); setError('');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  async function confirmar() {
    if (!catId || !fornId || rows.length === 0) return;
    try {
      const res = await importarMateriais.mutateAsync({ categoriaId: catId, fornecedorId: fornId, materiais: rows });
      setResult(res);
    } catch { /* handled by onError */ }
  }

  return (
    <Modal open={open} onClose={fechar} title="Importar Materiais via CSV" size="lg">
      {result ? (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${result.criados > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.criados > 0 ? <CheckCircle size={20} className="text-green-600 flex-shrink-0" /> : <XCircle size={20} className="text-red-500 flex-shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-gray-900">{result.criados} material(is) importado(s) com sucesso</p>
              {result.erros.length > 0 && <p className="text-xs text-red-600 mt-0.5">{result.erros.length} erro(s)</p>}
            </div>
          </div>
          {result.erros.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden max-h-40 overflow-y-auto">
              {result.erros.map((err, i) => (
                <div key={i} className="px-4 py-2 border-b border-red-100 last:border-0">
                  <p className="text-xs text-red-700"><strong>{err.nome}</strong>: {err.mensagem}</p>
                </div>
              ))}
            </div>
          )}
          <ModalFooter onCancel={fechar} onConfirm={fechar} confirmLabel="Fechar" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria (para todos os itens)" required>
              <select className={selectCls} value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">Selecione a categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor (para todos os itens)" required>
              <select className={selectCls} value={fornId} onChange={(e) => setFornId(e.target.value)}>
                <option value="">Selecione o fornecedor</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
              </select>
            </Field>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 font-medium mb-2">Formato do CSV — colunas obrigatórias:</p>
            <code className="text-xs text-blue-900 block bg-white px-3 py-2 rounded-lg border border-blue-200">nome, preco, minimo, maximo [, unidade]</code>
            <button onClick={gerarTemplate} className="mt-2 text-xs text-blue-600 hover:underline">Baixar template de exemplo →</button>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition">
            <Upload size={24} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500 mb-3">Selecione ou arraste um arquivo CSV</p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition">Escolher arquivo</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVUpload} />
            </label>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          {rows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">{rows.length} material(is) encontrado(s) — prévia:</p>
              <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">{['Nome','Unidade','Preço','Mín','Máx'].map((h) => <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-800 font-medium truncate max-w-[160px]">{r.nome}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.unidadeMedida}</td>
                        <td className="px-3 py-1.5 text-gray-700">R$ {r.precoUnitario.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.estoqueMinimo}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.estoqueMaximo}</td>
                      </tr>
                    ))}
                    {rows.length > 10 && <tr><td colSpan={5} className="px-3 py-2 text-center text-xs text-gray-400">+ {rows.length - 10} mais...</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <ModalFooter
            onCancel={fechar}
            onConfirm={confirmar}
            loading={importarMateriais.isPending}
            disabled={!catId || !fornId || rows.length === 0}
            confirmLabel={`Importar ${rows.length > 0 ? rows.length : ''} material(is)`}
          />
        </div>
      )}
    </Modal>
  );
}
