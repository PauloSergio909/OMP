import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wrench, ClipboardList, AlertTriangle, Plus, Bell, Trash2, X, Pencil, Download } from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAgendaMes, useRemoverEventoAgenda, type EventoAgenda } from '../../hooks/useApi';
import { useUrlState } from '../../hooks/useUrlState';
import { exportCsv } from '../../utils/exportCsv';
import { DIAS_SEMANA, corClasses } from './agenda.constants';
import { EventoAgendaModal } from './EventoAgendaModal';

const tipoIcone = (tipo: EventoAgenda['tipo']) => {
  if (tipo === 'manutencao') return <Wrench size={13} className="text-orange-500" />;
  if (tipo === 'os') return <ClipboardList size={13} className="text-blue-500" />;
  return <Bell size={13} className="text-purple-500" />;
};
const tipoEmoji = (tipo: EventoAgenda['tipo']) =>
  tipo === 'manutencao' ? '🔧 ' : tipo === 'os' ? '📋 ' : '🔔 ';

function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[90px] p-1.5">
            <div className="h-7 w-7 rounded-full bg-gray-200 self-end ml-auto mb-1" />
            {i % 3 === 0 && <div className="h-4 rounded bg-gray-100 w-full mb-1" />}
            {i % 5 === 0 && <div className="h-4 rounded bg-gray-100 w-3/4" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgendaPage() {
  usePageTitle('Agenda');
  const navigate = useNavigate();
  const hoje = new Date();
  const defaultMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesStr, setMesStr] = useUrlState('mes', defaultMes);
  const [filtroTipo, setFiltroTipo] = useUrlState('tipo', '');
  const [confirmRemover, setConfirmRemover] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<EventoAgenda | null>(null);
  const [dataInicial, setDataInicial] = useState('');

  const [ano, mes] = useMemo(() => {
    const parts = mesStr.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10) - 1];
  }, [mesStr]);

  function navMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setMesStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const { data, isLoading } = useAgendaMes(mesStr);
  const removerEvento = useRemoverEventoAgenda();

  const eventosFiltrados = useMemo(
    () => (data?.eventos ?? []).filter((ev) => !filtroTipo || ev.tipo === filtroTipo),
    [data, filtroTipo],
  );
  const eventosMap = useMemo(() => {
    const map = new Map<string, EventoAgenda[]>();
    eventosFiltrados.forEach((ev) => { const lista = map.get(ev.data) ?? []; lista.push(ev); map.set(ev.data, lista); });
    return map;
  }, [eventosFiltrados]);

  const totalEventos = eventosFiltrados.length;
  const totalManutencoes = (data?.eventos ?? []).filter((e) => e.tipo === 'manutencao').length;
  const totalOS = (data?.eventos ?? []).filter((e) => e.tipo === 'os').length;
  const totalManuais = (data?.eventos ?? []).filter((e) => e.tipo === 'manual').length;
  const mesLabel = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function abrirNovo(data: string) { setEditando(null); setDataInicial(data); setModalOpen(true); }
  function abrirEditar(ev: EventoAgenda) { setEditando(ev); setModalOpen(true); }

  function exportarCSV() {
    const tipoLabel: Record<string, string> = { manutencao: 'Manutenção', os: 'OS', manual: 'Manual' };
    exportCsv(`agenda-${mesStr}`, ['Data', 'Tipo', 'Título', 'Subtítulo', 'Referência'],
      eventosFiltrados.map((ev) => [ev.data, tipoLabel[ev.tipo] ?? ev.tipo, ev.titulo, ev.subtitulo ?? '', ev.link ?? '']));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 capitalize">{mesLabel}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isLoading ? 'Carregando...' : `${totalEventos} evento${totalEventos !== 1 ? 's' : ''} — ${totalManutencoes} manutenção, ${totalOS} OS${totalManuais > 0 ? `, ${totalManuais} manual` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMesStr(defaultMes)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">Hoje</button>
          <div className="flex items-center gap-1">
            <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Mês anterior"><ChevronLeft size={16} className="text-gray-500" /></button>
            <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition" aria-label="Próximo mês"><ChevronRight size={16} className="text-gray-500" /></button>
          </div>
          {totalEventos > 0 && (
            <button onClick={exportarCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-xs hover:bg-gray-50 transition" title="Exportar eventos do mês como CSV">
              <Download size={13} /> CSV
            </button>
          )}
          <button onClick={() => abrirNovo(`${mesStr}-01`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
            <Plus size={13} /> Novo Evento
          </button>
        </div>
      </div>

      {/* Legenda / filtros */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {([
          { tipo: 'manutencao', icon: <Wrench size={12} className="text-orange-500" />, label: `Manutenção (${totalManutencoes})`, activeClass: 'bg-orange-100 border-orange-300 text-orange-700' },
          { tipo: 'os',         icon: <ClipboardList size={12} className="text-blue-500" />, label: `OS agendada (${totalOS})`,    activeClass: 'bg-blue-100 border-blue-300 text-blue-700' },
          { tipo: 'manual',     icon: <Bell size={12} className="text-purple-500" />, label: `Eventos manuais (${totalManuais})`,  activeClass: 'bg-purple-100 border-purple-300 text-purple-700' },
        ] as const).map(({ tipo, icon, label, activeClass }) => {
          const ativo = filtroTipo === tipo;
          return (
            <button key={tipo} onClick={() => setFiltroTipo(ativo ? '' : tipo)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition ${ativo ? activeClass : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`} title={ativo ? 'Remover filtro' : `Filtrar por ${tipo}`}>
              {icon} {label} {ativo && <X size={10} className="ml-0.5" />}
            </button>
          );
        })}
        {filtroTipo && <button onClick={() => setFiltroTipo('')} className="text-xs text-gray-400 hover:text-gray-600 transition px-1">Limpar filtro</button>}
        <div className="flex items-center gap-1.5 text-gray-400 pl-2 border-l border-gray-200">
          <AlertTriangle size={12} className="text-red-500" /> OS de alta prioridade (em vermelho)
        </div>
      </div>

      {/* Calendário */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>
        {isLoading ? <CalendarSkeleton /> : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {cells.map((dia, idx) => {
              if (!dia) return <div key={idx} className="min-h-[90px] bg-gray-50/40" />;
              const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const eventosNoDia = eventosMap.get(dateStr) ?? [];
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
              return (
                <div key={dateStr} className="min-h-[90px] p-1.5 flex flex-col gap-1 group/day">
                  <div className="flex items-center justify-between mb-0.5">
                    <button onClick={() => abrirNovo(dateStr)} className="p-0.5 rounded text-gray-200 hover:text-blue-500 hover:bg-blue-50 transition opacity-0 group-hover/day:opacity-100" title={`Criar evento em ${dateStr}`} aria-label={`Criar evento em ${dateStr}`}>
                      <Plus size={11} />
                    </button>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isHoje ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{dia}</div>
                  </div>
                  {eventosNoDia.slice(0, 3).map((ev, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); if (ev.link) navigate(ev.link); }} className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition ${corClasses[ev.cor] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`} title={`${ev.titulo}${ev.subtitulo ? ` — ${ev.subtitulo}` : ''}`}>
                      {tipoEmoji(ev.tipo)}{ev.titulo.split(' — ')[1] ?? ev.titulo}
                    </button>
                  ))}
                  {eventosNoDia.length > 3 && <span className="text-[10px] text-gray-400 px-1">+{eventosNoDia.length - 3} mais</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de eventos */}
      {!isLoading && totalEventos > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              {filtroTipo ? `Eventos do mês — ${filtroTipo === 'manutencao' ? 'Manutenções' : filtroTipo === 'os' ? 'OS' : 'Manuais'} (${totalEventos})` : `Todos os eventos do mês (${totalEventos})`}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {eventosFiltrados.map((ev) => (
              <div key={ev.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition group">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.tipo === 'manutencao' ? 'bg-orange-50' : ev.tipo === 'os' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  {tipoIcone(ev.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  {ev.link ? (
                    <button onClick={() => navigate(ev.link!)} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition truncate block text-left">{ev.titulo}</button>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">{ev.titulo}</p>
                  )}
                  {ev.subtitulo && <p className="text-xs text-gray-400 mt-0.5">{ev.subtitulo}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  {ev.editavel && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      {confirmRemover === ev.id ? (
                        <>
                          <button onClick={() => { removerEvento.mutate(ev.id); setConfirmRemover(null); }} className="text-[10px] text-red-600 font-medium hover:underline">Remover</button>
                          <button onClick={() => setConfirmRemover(null)} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => abrirEditar(ev)} className="p-1 text-gray-300 hover:text-blue-500 transition rounded" aria-label="Editar evento"><Pencil size={13} /></button>
                          <button onClick={() => setConfirmRemover(ev.id)} className="p-1 text-gray-300 hover:text-red-500 transition rounded" aria-label="Remover evento"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EventoAgendaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        editando={editando}
        dataInicial={dataInicial}
      />
    </div>
  );
}
