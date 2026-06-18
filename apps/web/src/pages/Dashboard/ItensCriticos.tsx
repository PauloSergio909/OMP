import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useEstoqueKPIs } from '../../hooks/useApi';

export function ItensCriticos() {
  const navigate = useNavigate();
  const { data: estoqueKPIs, isLoading } = useEstoqueKPIs();

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Itens Críticos</h3>
      <p className="text-xs text-gray-400 mb-3">Abaixo do estoque mínimo</p>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (estoqueKPIs?.materiaisCriticos ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <Package size={24} className="mb-2 opacity-40" />
          <p className="text-xs">Nenhum item crítico</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(estoqueKPIs?.materiaisCriticos ?? []).slice(0, 6).map((m) => {
            const qtd = m.estoques?.[0]?.quantidade ?? 0;
            const pct = Math.round((qtd / m.estoqueMinimo) * 100);
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/estoque/${m.id}`)}
                className="flex items-center gap-3 w-full text-left hover:opacity-75 transition"
                title="Ver material no estoque"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{m.nome}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-red-600 font-medium whitespace-nowrap">{qtd}/{m.estoqueMinimo}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
