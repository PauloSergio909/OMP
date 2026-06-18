import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Wrench, ClipboardList, ArrowRight } from 'lucide-react';
import { useAgendaMes } from '../../hooks/useApi';

const corMap: Record<string, string> = {
  red:    'bg-red-100 text-red-700',
  orange: 'bg-amber-100 text-amber-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
};

const iconeMap: Record<string, ReactNode> = {
  manutencao: <Wrench size={13} />,
  os:         <ClipboardList size={13} />,
  manual:     <Calendar size={13} />,
};

const tipoLabel: Record<string, string> = {
  manutencao: 'Manutenção',
  os:         'OS',
  manual:     'Evento',
};

export function ProximosEventos() {
  const navigate = useNavigate();
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const { data: agendaData } = useAgendaMes(mesAtual);

  const proximos = (agendaData?.eventos ?? []).filter((e) => e.data >= hoje).slice(0, 6);

  if (proximos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Próximos Eventos</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{proximos.length}</span>
        </div>
        <button onClick={() => navigate('/agenda')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          Ver agenda <ArrowRight size={11} />
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {proximos.map((ev, i) => {
          const diasAte = Math.ceil((new Date(ev.data).getTime() - new Date(hoje).getTime()) / 86400000);
          return (
            <button
              key={i}
              onClick={() => ev.link && navigate(ev.link)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition text-left"
            >
              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${corMap[ev.cor] ?? 'bg-gray-100 text-gray-600'}`}>
                {iconeMap[ev.tipo]} {tipoLabel[ev.tipo] ?? ev.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{ev.titulo}</p>
                <p className="text-xs text-gray-400 truncate">{ev.subtitulo}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700">
                  {new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </p>
                <p className={`text-[10px] font-medium ${diasAte === 0 ? 'text-red-500' : diasAte <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {diasAte === 0 ? 'hoje' : `em ${diasAte}d`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
