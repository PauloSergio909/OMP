import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Car } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { cnhAlert } from './funcionarios.constants';

interface CnhAlertItem {
  id: string;
  nome: string;
  telefone: string;
  cnhCategoria?: string | null;
  cnhValidade: string;
}

interface Props {
  alertas: CnhAlertItem[];
  filtroCnhAtivo: boolean;
  onToggleFiltro: () => void;
}

export function BannerCnhVencendo({ alertas, filtroCnhAtivo, onToggleFiltro }: Props) {
  const navigate = useNavigate();
  if (alertas.length === 0) return null;

  const vencidas = alertas.filter((c) => cnhAlert(c.cnhValidade) === 'vencida');
  const isRed = vencidas.length > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isRed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`flex items-center justify-between gap-2 px-5 py-3 border-b ${isRed ? 'bg-red-100/50 border-red-200' : 'bg-amber-100/50 border-amber-200'}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className={`shrink-0 ${isRed ? 'text-red-500' : 'text-amber-600'}`} />
          <span className={`text-sm font-semibold ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
            {vencidas.length > 0
              ? `${vencidas.length} CNH vencida${vencidas.length > 1 ? 's' : ''}`
              : `${alertas.length} CNH vencendo nos próximos 30 dias`}
            {vencidas.length > 0 && alertas.length > vencidas.length && (
              <span className={`ml-1.5 text-xs font-normal ${isRed ? 'text-red-600' : ''}`}>
                · {alertas.length - vencidas.length} vencendo em breve
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onToggleFiltro}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 ${filtroCnhAtivo ? (isRed ? 'bg-red-600 text-white' : 'bg-amber-600 text-white') : (isRed ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200')}`}
        >
          {filtroCnhAtivo ? 'Remover filtro ×' : 'Filtrar lista →'}
        </button>
      </div>
      <div className={`divide-y ${isRed ? 'divide-red-100' : 'divide-amber-100'}`}>
        {alertas.map((c) => {
          const dias = Math.ceil((new Date(c.cnhValidade).getTime() - Date.now()) / 86400000);
          const vencida = dias < 0;
          return (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${vencida ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <Car size={14} className={vencida ? 'text-red-500' : 'text-amber-600'} />
                </div>
                <div className="min-w-0">
                  <button onClick={() => navigate(`/funcionarios/${c.id}`)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition text-left truncate block">
                    {c.nome}
                  </button>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">CNH {c.cnhCategoria ?? '—'}</span>
                    <CopyText text={c.telefone} className="text-xs text-gray-400" />
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-4 ${vencida ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {vencida ? `${Math.abs(dias)}d vencida` : `${dias}d`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
