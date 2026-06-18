import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Gauge, User, Calendar, Wrench, Settings, Fuel, Shield } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RelDate } from '../../components/ui/RelDate';
import { useRankingEficiencia, useProximosManutencaoKm, type CaminhaoListItem } from '../../hooks/useApi';
import { statusBarColors, statusFilterLabels, manutencaoInfo } from './frota.constants';

interface Props {
  caminhoes: CaminhaoListItem[];
  onEditar: (cam: CaminhaoListItem) => void;
  onFiltrar: (status: string) => void;
  onFiltrarManutencao: () => void;
}

export function FrotaGridView({ caminhoes, onEditar, onFiltrar, onFiltrarManutencao }: Props) {
  const navigate = useNavigate();
  const { data: rankingEficiencia = [] } = useRankingEficiencia();
  const { data: proximosKm = [] } = useProximosManutencaoKm(1000);

  const eficienciaMap = useMemo(() => new Map(rankingEficiencia.map((r) => [r.caminhaoId, r.mediaKmL])), [rankingEficiencia]);
  const kmAlertaMap  = useMemo(() => new Map(proximosKm.map((r) => [r.id, r])), [proximosKm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {caminhoes.map((cam) => (
        <div
          key={cam.id}
          onClick={() => navigate(`/frota/${cam.id}`)}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
        >
          <div className={`h-1.5 ${statusBarColors[cam.status] ?? 'bg-gray-300'}`} />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyText text={cam.codigo} className="text-base font-bold text-gray-900" />
                  <button onClick={(e) => { e.stopPropagation(); onFiltrar(cam.status); onFiltrarManutencao(); }} className="hover:opacity-75 transition" title={`Filtrar por ${statusFilterLabels[cam.status] ?? cam.status}`}>
                    <StatusBadge status={cam.status} />
                  </button>
                  {(cam._count?.ordensServico ?? 0) > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?caminhao=${cam.id}`); }} title="Ver ordens de serviço deste veículo" className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full hover:bg-amber-200 transition">
                      <Wrench size={10} /> {cam._count.ordensServico} OS
                    </button>
                  )}
                  {(() => {
                    const kmAlerta = kmAlertaMap.get(cam.id);
                    if (!kmAlerta) return null;
                    return (
                      <span className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${kmAlerta.urgente ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`} title={kmAlerta.urgente ? 'KM de manutenção ultrapassado' : `${kmAlerta.kmRestantes.toLocaleString('pt-BR')} km para manutenção`}>
                        <Gauge size={10} /> {kmAlerta.urgente ? 'KM!' : `${kmAlerta.kmRestantes.toLocaleString('pt-BR')}km`}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{cam.modelo}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onEditar(cam); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition" aria-label="Editar caminhão">
                <Settings size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MapPin size={13} className="text-gray-400" />
                <CopyText text={cam.placa} className="font-medium text-gray-700 text-xs" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Gauge size={13} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{cam.kmAtual?.toLocaleString('pt-BR')} km</span>
                </div>
                {eficienciaMap.get(cam.id) != null && (
                  <div className="flex items-center gap-1 pl-[21px] text-[10px] text-amber-600 font-medium">
                    <Fuel size={9} />{eficienciaMap.get(cam.id)!.toFixed(2)} km/L
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User size={13} className="text-gray-400" />
                {cam.motorista ? (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${cam.motorista!.id}`); }} className="font-medium text-gray-700 hover:text-blue-600 transition text-left" title="Ver perfil do motorista">
                    {cam.motorista.nome}
                  </button>
                ) : (
                  <span className="font-medium text-gray-400 italic">Sem motorista</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={13} className="text-gray-400" />
                  {cam.proximaManutencao ? (() => {
                    const { dias, cor } = manutencaoInfo(cam.proximaManutencao);
                    return (
                      <span className={cor}>
                        <RelDate date={cam.proximaManutencao} />
                        {dias <= 30 && <span className="ml-1">({dias < 0 ? 'vencida!' : `${dias}d`})</span>}
                      </span>
                    );
                  })() : <span className="font-medium text-gray-700">—</span>}
                </div>
                {cam.proximaManutencaoKm && (() => {
                  const kmAlvo = cam.proximaManutencaoKm!;
                  const kmBase = Math.max(0, kmAlvo - 10000);
                  const pct = Math.min(100, Math.max(0, Math.round(((cam.kmAtual - kmBase) / (kmAlvo - kmBase)) * 100)));
                  const cor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-400';
                  return (
                    <div title={`KM: ${cam.kmAtual.toLocaleString('pt-BR')} / meta ${kmAlvo.toLocaleString('pt-BR')} km`}>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pct}% do km de manutenção</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">{cam.fabricante} • {cam.anoFabricacao}</span>
                {(() => {
                  const hoje = new Date();
                  const em30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const crlvVencida    = cam.vencimentoCrlv   && new Date(cam.vencimentoCrlv) < hoje;
                  const seguroVencido  = cam.vencimentoSeguro && new Date(cam.vencimentoSeguro) < hoje;
                  const crlvVencendo   = cam.vencimentoCrlv   && !crlvVencida   && new Date(cam.vencimentoCrlv) <= em30;
                  const seguroVencendo = cam.vencimentoSeguro && !seguroVencido && new Date(cam.vencimentoSeguro) <= em30;
                  if (!crlvVencida && !seguroVencido && !crlvVencendo && !seguroVencendo) return null;
                  const critico = crlvVencida || seguroVencido;
                  return (
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${critico ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Shield size={9} />
                      {critico ? 'Doc vencido' : 'Doc vencendo'}
                    </span>
                  );
                })()}
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate(`/frota/${cam.id}`); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Ver detalhes →
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
