import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Settings, Fuel } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RelDate } from '../../components/ui/RelDate';
import { useRankingEficiencia, useProximosManutencaoKm, type CaminhaoListItem } from '../../hooks/useApi';
import { statusFilterLabels, manutencaoInfo } from './frota.constants';

interface Props {
  caminhoes: CaminhaoListItem[];
  onEditar: (cam: CaminhaoListItem) => void;
  onFiltrar: (status: string) => void;
  onFiltrarFabricante: (fabricante: string) => void;
}

export function FrotaListaView({ caminhoes, onEditar, onFiltrar, onFiltrarFabricante }: Props) {
  const navigate = useNavigate();
  const { data: rankingEficiencia = [] } = useRankingEficiencia();
  const { data: proximosKm = [] } = useProximosManutencaoKm(1000);

  const eficienciaMap = useMemo(() => new Map(rankingEficiencia.map((r) => [r.caminhaoId, r.mediaKmL])), [rankingEficiencia]);
  const kmAlertaMap  = useMemo(() => new Map(proximosKm.map((r) => [r.id, r])), [proximosKm]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Código', 'Placa', 'Fabricante / Modelo', 'KM Atual', 'Motorista', 'Status', 'Próx. Manutenção', 'Documentos', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {caminhoes.map((cam) => {
              const { dias, cor } = cam.proximaManutencao ? manutencaoInfo(cam.proximaManutencao) : { dias: null as number | null, cor: 'text-gray-400' };
              return (
                <tr key={cam.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/frota/${cam.id}`)}>
                  <td className="px-4 py-3"><CopyText text={cam.codigo} className="text-sm font-mono font-bold text-blue-600" /></td>
                  <td className="px-4 py-3"><CopyText text={cam.placa} className="text-sm font-mono text-gray-700" /></td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); onFiltrarFabricante(cam.fabricante ?? ''); }} className="text-sm font-medium text-gray-800 hover:text-blue-600 transition text-left" title={`Filtrar por ${cam.fabricante}`}>
                      {cam.fabricante}
                    </button>
                    <p className="text-xs text-gray-400">{cam.modelo} · {cam.anoFabricacao}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{cam.kmAtual?.toLocaleString('pt-BR')} km</span>
                    {eficienciaMap.get(cam.id) != null && (
                      <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-0.5">
                        <Fuel size={9} />{eficienciaMap.get(cam.id)!.toFixed(2)} km/L
                      </p>
                    )}
                    {(() => {
                      const kmA = kmAlertaMap.get(cam.id);
                      if (!kmA) return null;
                      return (
                        <p className={`text-[11px] font-bold mt-0.5 flex items-center gap-0.5 ${kmA.urgente ? 'text-red-600' : 'text-orange-600'}`}>
                          <Gauge size={9} />{kmA.urgente ? 'KM vencida!' : `${kmA.kmRestantes.toLocaleString('pt-BR')} km p/ manutenção`}
                        </p>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {cam.motorista ? (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${cam.motorista!.id}`); }} className="text-sm text-gray-700 hover:text-blue-600 transition text-left" title="Ver perfil do motorista">
                        {cam.motorista.nome}
                      </button>
                    ) : <span className="text-sm text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); onFiltrar(cam.status); }} className="hover:opacity-75 transition text-left" title={`Filtrar por ${statusFilterLabels[cam.status] ?? cam.status}`}>
                      <StatusBadge status={cam.status} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {cam.proximaManutencao ? (
                      <span className={`text-sm ${cor}`}>
                        <RelDate date={cam.proximaManutencao} />
                        {dias !== null && dias <= 30 && <span className="ml-1 text-xs">({dias < 0 ? 'vencida' : `${dias}d`})</span>}
                      </span>
                    ) : <span className="text-sm text-gray-300">—</span>}
                    {cam.proximaManutencaoKm && (
                      <p className={`text-[11px] mt-0.5 ${cam.kmAtual >= cam.proximaManutencaoKm ? 'text-red-600 font-bold' : cam.kmAtual >= cam.proximaManutencaoKm - 1000 ? 'text-amber-600' : 'text-gray-400'}`} title={`Manutenção prevista aos ${cam.proximaManutencaoKm.toLocaleString('pt-BR')} km`}>
                        km {cam.proximaManutencaoKm.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const hoje = new Date();
                      const crlvD = cam.vencimentoCrlv ? Math.ceil((new Date(cam.vencimentoCrlv).getTime() - hoje.getTime()) / 86400000) : null;
                      const segD  = cam.vencimentoSeguro ? Math.ceil((new Date(cam.vencimentoSeguro).getTime() - hoje.getTime()) / 86400000) : null;
                      const partes: string[] = [];
                      if (crlvD !== null) partes.push(`CRLV: ${crlvD < 0 ? '⚠ vencido' : `${crlvD}d`}`);
                      if (segD !== null) partes.push(`Seg: ${segD < 0 ? '⚠ vencido' : `${segD}d`}`);
                      if (partes.length === 0) return <span className="text-sm text-gray-300">—</span>;
                      const critico = (crlvD !== null && crlvD < 0) || (segD !== null && segD < 0);
                      const atencao = !critico && ((crlvD !== null && crlvD <= 30) || (segD !== null && segD <= 30));
                      return (
                        <div className="space-y-0.5">
                          {partes.map((p, i) => <p key={i} className={`text-xs font-medium ${critico ? 'text-red-600' : atencao ? 'text-amber-600' : 'text-gray-600'}`}>{p}</p>)}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); onEditar(cam); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition opacity-0 group-hover:opacity-100" title="Editar veículo">
                      <Settings size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
