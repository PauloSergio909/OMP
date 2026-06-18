import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Tag, Building2, Edit, Check, X, type LucideIcon } from 'lucide-react';
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { RelDate } from '../../components/ui/RelDate';
import { useAtualizarLocalizacao, type MaterialDetalhe, type MaterialMovimentacaoItem } from '../../hooks/useApi';

interface Props {
  material: MaterialDetalhe;
  id: string;
}

function CardHeader({ icon: Icon, iconClass, title }: { icon: LucideIcon; iconClass: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className={iconClass} />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
    </div>
  );
}

export function MaterialInfoCards({ material, id }: Props) {
  const navigate = useNavigate();
  const [editandoLocalizacao, setEditandoLocalizacao] = useState(false);
  const [novaLocalizacao, setNovaLocalizacao] = useState('');
  const atualizarLoc = useAtualizarLocalizacao();

  const movimentacoes: MaterialMovimentacaoItem[] = material.movimentacoes ?? [];
  const qtdAtual     = material.estoques?.[0]?.quantidade ?? 0;
  const localizacao  = material.estoques?.[0]?.localizacao ?? null;
  const isCritico    = qtdAtual < material.estoqueMinimo;
  const pct          = material.estoqueMaximo > 0 ? Math.min(Math.round((qtdAtual / material.estoqueMaximo) * 100), 100) : 0;
  const barColor     = isCritico ? 'bg-red-500' : pct < 40 ? 'bg-amber-400' : 'bg-green-500';
  const valorEstoque = qtdAtual * material.precoUnitario;
  const ultimaAtualizacao = material.estoques?.[0]?.ultimaAtualizacao;

  const ultimaEntrada = movimentacoes.find((m) => m.tipo === 'entrada');
  const ultimaSaida   = movimentacoes.find((m) => m.tipo === 'saida');

  const resumo = useMemo(() => {
    const totalEntradas  = movimentacoes.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0);
    const totalSaidas    = movimentacoes.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0);
    const valorEntradas  = movimentacoes.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade * m.precoUnitario, 0);
    const valorSaidas    = movimentacoes.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.quantidade * m.precoUnitario, 0);
    return { totalEntradas, totalSaidas, valorEntradas, valorSaidas };
  }, [movimentacoes]);

  const precosEntrada = useMemo(() => {
    return [...movimentacoes].filter((m) => m.tipo === 'entrada').reverse().slice(-12).map((m) => ({
      data: new Date(m.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' }),
      preco: m.precoUnitario,
    }));
  }, [movimentacoes]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Estoque Atual */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <CardHeader icon={Package} iconClass="text-blue-500" title="Estoque Atual" />
        <p className={`text-3xl font-bold mb-1 ${isCritico ? 'text-red-600' : 'text-gray-900'}`}>
          {qtdAtual}<span className="text-sm font-normal text-gray-400 ml-1">{material.unidadeMedida}</span>
        </p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
        <p className="text-xs text-gray-400">Min: <strong>{material.estoqueMinimo}</strong> · Max: <strong>{material.estoqueMaximo}</strong></p>
        {ultimaAtualizacao && (
          <p className="text-xs text-gray-400 mt-1">
            Atualizado <RelDate date={ultimaAtualizacao} />
          </p>
        )}
      </div>

      {/* Preço / Valor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <CardHeader icon={TrendingUp} iconClass="text-green-500" title="Preço / Valor" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              R$ {material.precoUnitario.toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-1">/ {material.unidadeMedida}</span>
            </p>
            <p className="text-sm text-gray-600">
              Valor em estoque:{' '}
              <strong className="text-gray-900">R$ {valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
          {precosEntrada.length >= 2 && (() => {
            const min = Math.min(...precosEntrada.map((p) => p.preco));
            const max = Math.max(...precosEntrada.map((p) => p.preco));
            const variou = max !== min;
            const cor = precosEntrada[precosEntrada.length - 1].preco > precosEntrada[0].preco ? '#ef4444' : '#22c55e';
            return (
              <div className="flex flex-col items-end gap-1">
                <div style={{ width: 80, height: 36 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={precosEntrada}>
                      <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Preço']} labelFormatter={(l) => l} />
                      <Line type="monotone" dataKey="preco" stroke={cor} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-400">{variou ? `R$ ${min.toFixed(2)} – R$ ${max.toFixed(2)}` : 'Preço estável'}</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Classificação */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <CardHeader icon={Tag} iconClass="text-purple-500" title="Classificação" />
        <div className="space-y-1.5">
          <div>
            <p className="text-xs text-gray-400">Categoria</p>
            <p className="text-sm font-semibold text-gray-800">{material.categoria?.nome ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Fornecedor</p>
            {material.fornecedor ? (
              <button onClick={() => navigate(`/compras?q=${encodeURIComponent(material.fornecedor!.razaoSocial)}`)} className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition text-left" title="Ver compras deste fornecedor">
                {material.fornecedor.razaoSocial}
              </button>
            ) : <p className="text-sm text-gray-300">—</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400">Unidade</p>
            <p className="text-sm font-semibold text-gray-800">{material.unidadeMedida}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Localização</p>
            {editandoLocalizacao ? (
              <div className="flex items-center gap-1.5">
                <input
                  className="text-sm font-mono border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 w-32"
                  value={novaLocalizacao}
                  onChange={(e) => setNovaLocalizacao(e.target.value)}
                  placeholder="Ex: A2-P3"
                  autoFocus maxLength={100}
                />
                <button
                  onClick={async () => {
                    await atualizarLoc.mutateAsync({ materialId: id, localizacao: novaLocalizacao.trim() || null });
                    setEditandoLocalizacao(false);
                  }}
                  disabled={atualizarLoc.isPending}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                >
                  <Check size={14} />
                </button>
                <button onClick={() => setEditandoLocalizacao(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/loc">
                {localizacao
                  ? <span className="text-sm font-semibold text-blue-700 font-mono">{localizacao}</span>
                  : <span className="text-sm text-gray-300 italic">Não definida</span>}
                <button
                  onClick={() => { setNovaLocalizacao(localizacao ?? ''); setEditandoLocalizacao(true); }}
                  className="opacity-0 group-hover/loc:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Editar localização"
                >
                  <Edit size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <CardHeader icon={Building2} iconClass="text-amber-500" title="Histórico" />
        <div className="space-y-1.5">
          <div>
            <p className="text-xs text-gray-400">Total de movimentações</p>
            <p className="text-2xl font-bold text-gray-900">{movimentacoes.length}</p>
          </div>
          {movimentacoes.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                <p className="text-[10px] font-semibold text-green-600 uppercase mb-0.5">Entradas</p>
                <p className="text-sm font-bold text-green-700">+{resumo.totalEntradas} {material.unidadeMedida}</p>
                <p className="text-[10px] text-green-500">R$ {resumo.valorEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                <p className="text-[10px] font-semibold text-red-600 uppercase mb-0.5">Saídas</p>
                <p className="text-sm font-bold text-red-700">-{resumo.totalSaidas} {material.unidadeMedida}</p>
                <p className="text-[10px] text-red-500">R$ {resumo.valorSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          )}
          {ultimaEntrada && (
            <div>
              <p className="text-xs text-gray-400">Última entrada</p>
              <p className="text-sm font-medium text-green-700">
                +{ultimaEntrada.quantidade} {material.unidadeMedida}{' '}
                <span className="text-gray-400 font-normal text-xs">
                  <RelDate date={ultimaEntrada.createdAt} />
                </span>
              </p>
            </div>
          )}
          {ultimaSaida && (
            <div>
              <p className="text-xs text-gray-400">Última saída</p>
              <p className="text-sm font-medium text-red-700">
                -{ultimaSaida.quantidade} {material.unidadeMedida}{' '}
                <span className="text-gray-400 font-normal text-xs">
                  <RelDate date={ultimaSaida.createdAt} />
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
