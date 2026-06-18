import { useState } from 'react';
import { CircleDot, Plus } from 'lucide-react';
import { usePneusCaminhao, type PneuItem } from '../../hooks/useApi';
import { POSICOES_LABELS } from './pneus.constants';
import { CadastrarPneuModal } from './CadastrarPneuModal';
import { TrocarPneuModal } from './TrocarPneuModal';

interface Props {
  caminhaoId: string;
  kmAtual: number;
}

export function CaminhaoPneus({ caminhaoId, kmAtual }: Props) {
  const { data: pneus = [] } = usePneusCaminhao(caminhaoId);
  const [modalNovoPneu, setModalNovoPneu] = useState(false);
  const [modalTroca, setModalTroca] = useState<PneuItem | null>(null);

  const proximos = pneus.filter((p) => Math.max(0, kmAtual - p.kmInstalacao) / p.kmVidaUtil >= 0.8).length;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot size={15} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Controle de Pneus</h3>
            {proximos > 0 && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                {proximos} próximo(s) do limite
              </span>
            )}
          </div>
          <button
            onClick={() => setModalNovoPneu(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={13} /> Cadastrar pneu
          </button>
        </div>

        {pneus.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            <CircleDot size={28} className="mx-auto mb-2 opacity-30" />
            Nenhum pneu cadastrado
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pneus.map((p) => {
              const kmRodados = Math.max(0, kmAtual - p.kmInstalacao);
              const pct = Math.min(100, Math.round((kmRodados / p.kmVidaUtil) * 100));
              const alerta = pct >= 80;
              return (
                <div key={p.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{POSICOES_LABELS[p.posicao] ?? p.posicao}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.status === 'ativo' ? 'Ativo' : p.status}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.marca} — {p.modelo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {kmRodados.toLocaleString('pt-BR')} km rodados de {p.kmVidaUtil.toLocaleString('pt-BR')} km
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${alerta ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-8 text-right ${alerta ? 'text-red-600' : 'text-gray-600'}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  {p.status === 'ativo' && (
                    <button
                      onClick={() => setModalTroca(p)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium whitespace-nowrap border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition"
                    >
                      Trocar →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CadastrarPneuModal open={modalNovoPneu} onClose={() => setModalNovoPneu(false)} caminhaoId={caminhaoId} kmAtual={kmAtual} />
      <TrocarPneuModal pneu={modalTroca} onClose={() => setModalTroca(null)} caminhaoId={caminhaoId} kmAtual={kmAtual} />
    </>
  );
}
