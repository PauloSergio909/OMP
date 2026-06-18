import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Wrench } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { RelDate } from '../../components/ui/RelDate';

interface ManutencaoItem {
  id: string;
  codigo: string;
  modelo: string;
  placa: string;
  proximaManutencao: string;
}

interface Props {
  alertas: ManutencaoItem[];
  filtroAtivo: boolean;
  onToggle: () => void;
}

export function BannerManutencao({ alertas, filtroAtivo, onToggle }: Props) {
  const navigate = useNavigate();
  if (alertas.length === 0) return null;

  const vencidas = alertas.filter((c) => new Date(c.proximaManutencao) < new Date());
  const isRed = vencidas.length > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isRed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <button
        className={`w-full flex items-center gap-2 px-5 py-3 border-b text-left transition ${isRed ? 'bg-red-100/50 border-red-200 hover:bg-red-100' : 'bg-amber-100/50 border-amber-200 hover:bg-amber-100'}`}
        onClick={onToggle}
        title={filtroAtivo ? 'Remover filtro — mostrar todos' : 'Filtrar lista abaixo para estes veículos'}
      >
        <AlertTriangle size={16} className={`shrink-0 ${isRed ? 'text-red-500' : 'text-amber-600'}`} />
        <span className={`text-sm font-semibold ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
          {vencidas.length > 0
            ? `${vencidas.length} veículo${vencidas.length > 1 ? 's' : ''} com manutenção vencida`
            : `${alertas.length} veículo${alertas.length > 1 ? 's' : ''} com manutenção nos próximos 30 dias`}
        </span>
        <span className={`ml-auto text-xs font-medium ${isRed ? 'text-red-600' : 'text-amber-700'}`}>
          {filtroAtivo ? 'Remover filtro ×' : 'Filtrar lista →'}
        </span>
      </button>
      <div className="divide-y divide-amber-100">
        {alertas.map((cam) => {
          const vencida = new Date(cam.proximaManutencao) < new Date();
          const dias = Math.ceil((new Date(cam.proximaManutencao).getTime() - Date.now()) / 86400000);
          return (
            <div key={cam.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg ${vencida ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <Wrench size={14} className={vencida ? 'text-red-500' : 'text-amber-600'} />
                </div>
                <div className="min-w-0">
                  <button onClick={() => navigate(`/frota/${cam.id}`)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition truncate block" title="Ver detalhes do veículo">
                    {cam.codigo} — {cam.modelo}
                  </button>
                  <CopyText text={cam.placa} className="text-xs text-gray-400 font-mono" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-700">
                    <RelDate date={cam.proximaManutencao} />
                  </p>
                  <p className={`text-xs font-semibold ${vencida ? 'text-red-600' : 'text-amber-600'}`}>
                    {vencida ? `${Math.abs(dias)}d vencida` : `em ${dias} dia${dias !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?caminhao=${cam.id}&tipo=preventiva`); }}
                  className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                  title="Ver OS preventivas deste veículo"
                >
                  Abrir OS
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
