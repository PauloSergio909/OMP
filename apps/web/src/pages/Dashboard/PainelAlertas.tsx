import { useNavigate } from 'react-router-dom';
import { Bell, Wrench, AlertTriangle, ShoppingCart, CircleDot, Gauge, type LucideIcon } from 'lucide-react';
import {
  useEstoqueAlertas, useManutencaoVencendo,
  usePneusKPIs, useComprasKPIs, useProximosManutencaoKm,
} from '../../hooks/useApi';

interface AlertSectionHeaderProps {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  badgeCount?: number;
  badgeClass?: string;
  onBadgeClick?: () => void;
}

function AlertSectionHeader({ icon: Icon, iconClass, title, badgeCount, badgeClass, onBadgeClick }: AlertSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className={iconClass} />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {(badgeCount ?? 0) > 0 && (
        <button onClick={onBadgeClick} className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${badgeClass}`}>
          {badgeCount}
        </button>
      )}
    </div>
  );
}

export function PainelAlertas() {
  const navigate = useNavigate();

  const { data: alertas = [], isLoading: loadingAlertas } = useEstoqueAlertas();
  const { data: manutencoes = [] }   = useManutencaoVencendo();
  const { data: pneusKPIs }          = usePneusKPIs();
  const { data: comprasKPIs }        = useComprasKPIs();
  const { data: proximosKm = [] }    = useProximosManutencaoKm(1000);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col gap-4">
      {/* Estoque crítico */}
      <div>
        <AlertSectionHeader
          icon={Bell} iconClass="text-orange-500"
          title="Estoque Crítico"
          badgeCount={alertas.length}
          badgeClass="bg-red-50 text-red-600 hover:bg-red-100"
          onBadgeClick={() => navigate('/estoque?critico=1')}
        />
        {loadingAlertas ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : alertas.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Nenhum alerta de estoque</p>
        ) : (
          <div className="space-y-1.5">
            {alertas.slice(0, 3).map((m) => {
              const qtd = m.estoques?.[0]?.quantidade ?? 0;
              const critico = qtd === 0;
              return (
                <button key={m.id} className={`w-full text-left p-2.5 rounded-xl border text-xs hover:opacity-80 transition ${critico ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`} onClick={() => navigate(`/estoque/${m.id}`)}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    <p className="font-medium truncate">{m.nome}</p>
                    <span className="ml-auto font-bold whitespace-nowrap">{qtd}/{m.estoqueMinimo}</span>
                  </div>
                </button>
              );
            })}
            {alertas.length > 3 && (
              <button onClick={() => navigate('/estoque?critico=1')} className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium pt-1">
                +{alertas.length - 3} no Estoque →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manutenções próximas */}
      <div className="pt-3 border-t border-gray-100">
        <AlertSectionHeader
          icon={Wrench} iconClass="text-blue-500"
          title="Manutenções Próximas"
          badgeCount={manutencoes.length}
          badgeClass="bg-orange-50 text-orange-600 hover:bg-orange-100"
          onBadgeClick={() => navigate('/frota?manutencao=1')}
        />
        {manutencoes.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Nenhuma manutenção nos próximos 30 dias</p>
        ) : (
          <div className="space-y-1.5">
            {manutencoes.slice(0, 3).map((c) => {
              const dias = Math.ceil((new Date(c.proximaManutencao).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const urgente = dias <= 7;
              return (
                <button key={c.id} className={`w-full text-left p-2.5 rounded-xl border text-xs hover:opacity-80 transition ${urgente ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`} onClick={() => navigate(`/frota/${c.id}`)}>
                  <div className="flex items-center gap-2">
                    <Wrench size={12} className="flex-shrink-0" />
                    <span className="font-medium truncate">{c.codigo}</span>
                    <span className="ml-auto font-bold whitespace-nowrap">{dias <= 0 ? 'Vencida!' : `${dias}d`}</span>
                  </div>
                </button>
              );
            })}
            {manutencoes.length > 3 && (
              <button onClick={() => navigate('/frota?manutencao=1')} className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium pt-1">
                +{manutencoes.length - 3} na Frota →
              </button>
            )}
          </div>
        )}
      </div>

      {/* OC Atrasadas */}
      {(comprasKPIs?.atrasadas ?? 0) > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <AlertSectionHeader
            icon={ShoppingCart} iconClass="text-red-500"
            title="OC Atrasadas"
            badgeCount={comprasKPIs?.atrasadas}
            badgeClass="bg-red-50 text-red-600 hover:bg-red-100"
            onBadgeClick={() => navigate('/compras?atrasada=1')}
          />
          <button onClick={() => navigate('/compras?atrasada=1')} className="w-full text-left p-2.5 rounded-xl border bg-red-50 border-red-200 text-xs text-red-700 hover:opacity-80 transition">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="flex-shrink-0" />
              <p className="font-medium">{comprasKPIs?.atrasadas} {comprasKPIs?.atrasadas === 1 ? 'ordem' : 'ordens'} com prazo vencido</p>
              <span className="ml-auto font-semibold">Ver →</span>
            </div>
          </button>
        </div>
      )}

      {/* Pneus em alerta */}
      {(pneusKPIs?.alertas80 ?? 0) > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <AlertSectionHeader
            icon={CircleDot}
            iconClass={(pneusKPIs?.alertas95 ?? 0) > 0 ? 'text-red-500' : 'text-amber-500'}
            title="Pneus em Alerta"
            badgeCount={pneusKPIs?.alertas80}
            badgeClass={`${(pneusKPIs?.alertas95 ?? 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} hover:opacity-80`}
            onBadgeClick={() => navigate('/relatorios?tab=Pneus')}
          />
          <button onClick={() => navigate('/relatorios?tab=Pneus')} className={`w-full text-left p-2.5 rounded-xl border text-xs hover:opacity-80 transition ${(pneusKPIs?.alertas95 ?? 0) > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <div className="flex items-center gap-2">
              <CircleDot size={12} className="flex-shrink-0" />
              <p className="font-medium">
                {pneusKPIs?.alertas80} pneu{pneusKPIs?.alertas80 !== 1 ? 's' : ''} com ≥ 80% de desgaste
                {(pneusKPIs?.alertas95 ?? 0) > 0 && <span className="ml-1 font-semibold">({pneusKPIs?.alertas95} urgente{pneusKPIs?.alertas95 !== 1 ? 's' : ''})</span>}
              </p>
              <span className="ml-auto font-semibold">Ver →</span>
            </div>
          </button>
        </div>
      )}

      {/* Manutenção por KM */}
      {proximosKm.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <AlertSectionHeader
            icon={Gauge}
            iconClass={proximosKm.some((c) => c.urgente) ? 'text-red-500' : 'text-amber-500'}
            title="Manutenção por KM"
            badgeCount={proximosKm.length}
            badgeClass={`${proximosKm.some((c) => c.urgente) ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} hover:opacity-80`}
            onBadgeClick={() => navigate('/frota')}
          />
          <div className="space-y-1.5">
            {proximosKm.slice(0, 3).map((c) => (
              <button key={c.id} onClick={() => navigate(`/frota/${c.id}`)} className={`w-full text-left p-2.5 rounded-xl border text-xs hover:opacity-80 transition ${c.urgente ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <div className="flex items-center gap-2">
                  <Gauge size={12} className="flex-shrink-0" />
                  <span className="font-medium truncate">{c.codigo}</span>
                  <span className="ml-auto font-bold whitespace-nowrap">{c.urgente ? 'VENCIDA!' : `${c.kmRestantes.toLocaleString('pt-BR')} km`}</span>
                </div>
              </button>
            ))}
            {proximosKm.length > 3 && (
              <button onClick={() => navigate('/frota')} className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium pt-1">
                +{proximosKm.length - 3} na Frota →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
