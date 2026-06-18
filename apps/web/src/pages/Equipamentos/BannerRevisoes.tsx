import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, Edit } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { RelDate } from '../../components/ui/RelDate';
import { tipoLabels } from './equipamentos.constants';
import type { EquipamentoEditTarget } from './EditarEquipamentoModal';

interface RevisaoItem {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  status: string;
  proximaRevisao: string | null;
  responsavel: { id: string; nome: string } | null;
  vencida: boolean;
  diasRestantes: number | null;
}

interface Props {
  alertas: RevisaoItem[];
  filtroAtivo: boolean;
  onToggle: () => void;
  onEditar: (eq: EquipamentoEditTarget) => void;
}

export function BannerRevisoes({ alertas, filtroAtivo, onToggle, onEditar }: Props) {
  const navigate = useNavigate();
  if (alertas.length === 0) return null;

  const vencidas = alertas.filter((r) => r.vencida);
  const isRed = vencidas.length > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isRed ? 'bg-red-50 border-red-200' : 'bg-white border-amber-200'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 px-5 py-3 border-b text-left transition hover:brightness-95 ${isRed ? 'bg-red-100/50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className={`shrink-0 ${isRed ? 'text-red-500' : 'text-amber-600'}`} />
          <span className={`text-sm font-semibold ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
            {isRed
              ? `${vencidas.length} revisão(ões) vencida(s)`
              : `${alertas.length} revisão(ões) nos próximos 30 dias`}
            {isRed && alertas.length > vencidas.length && (
              <span className="ml-1.5 text-xs font-normal text-red-600">
                · {alertas.length - vencidas.length} vencendo em breve
              </span>
            )}
          </span>
        </div>
        <span className={`text-xs font-medium shrink-0 ${filtroAtivo ? (isRed ? 'text-red-700' : 'text-amber-700') : (isRed ? 'text-red-500' : 'text-amber-500')}`}>
          {filtroAtivo ? 'Remover filtro ×' : 'Filtrar lista →'}
        </span>
      </button>
      <div className={`divide-y ${isRed ? 'divide-red-100' : 'divide-amber-100'}`}>
        {alertas.map((eq) => (
          <div key={eq.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/50 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-1.5 rounded-lg ${eq.vencida ? 'bg-red-100' : 'bg-amber-100'}`}>
                {eq.vencida
                  ? <AlertCircle size={14} className="text-red-500" />
                  : <Clock size={14} className="text-amber-600" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{eq.nome}</p>
                <p className="text-xs text-gray-400">
                  <CopyText text={eq.codigo} className="font-mono" /> · {tipoLabels[eq.tipo] ?? eq.tipo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              {eq.responsavel && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${eq.responsavel!.id}`); }}
                  className="text-xs text-gray-500 hidden sm:block hover:text-blue-600 transition text-left"
                  title="Ver perfil do responsável"
                >
                  {eq.responsavel.nome}
                </button>
              )}
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700">
                  {eq.proximaRevisao
                    ? <RelDate date={eq.proximaRevisao} />
                    : '—'}
                </p>
                <p className={`text-xs font-semibold ${eq.vencida ? 'text-red-600' : 'text-amber-600'}`}>
                  {eq.vencida
                    ? `${Math.abs(eq.diasRestantes ?? 0)}d vencida`
                    : `em ${eq.diasRestantes ?? '?'} dia(s)`}
                </p>
              </div>
              <button
                onClick={() => onEditar(eq)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                aria-label="Editar equipamento"
              >
                <Edit size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
