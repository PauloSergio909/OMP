import { TrendingUp } from 'lucide-react';
import { useCaminhaoTimeline, type TimelineEvent } from '../../hooks/useApi';

interface Props {
  id: string;
}

const tipoConfig: Record<string, (status?: string) => { icon: string; cor: string }> = {
  os:         (status) => ({ icon: '🔧', cor: status === 'concluida' ? 'text-green-600' : status === 'cancelada' ? 'text-gray-400' : 'text-amber-600' }),
  troca_pneu: ()       => ({ icon: '⚙️', cor: 'text-purple-600' }),
  checklist:  (status) => ({ icon: status === 'aprovado' ? '✅' : '⚠️', cor: status === 'aprovado' ? 'text-green-600' : 'text-red-600' }),
  km:         ()       => ({ icon: '📍', cor: 'text-blue-500' }),
};

export function CaminhaoTimeline({ id }: Props) {
  const { data: timeline = [] } = useCaminhaoTimeline(id);

  if (timeline.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <TrendingUp size={15} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900">Histórico de Eventos</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-auto">{timeline.length}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {timeline.map((ev: TimelineEvent) => {
          const cfg = (tipoConfig[ev.tipo] ?? (() => ({ icon: '•', cor: 'text-gray-500' })))(ev.status);
          return (
            <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
              <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${cfg.cor} truncate`}>{ev.titulo}</p>
                {ev.subtitulo && <p className="text-xs text-gray-400 mt-0.5">{ev.subtitulo}</p>}
                {ev.custo != null && ev.custo > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Custo: R$ {ev.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                {new Date(ev.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
