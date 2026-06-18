import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, Package, Wrench, Calendar, Car,
  ShoppingCart, CircleDot, Gauge,
} from 'lucide-react';
import {
  useEstoqueAlertas, useManutencaoVencendo, useCnhVencendo,
  useEquipamentosRevisoesVencendo, useComprasKPIs, useDocumentosVencendo,
  usePneusKPIs, useProximosManutencaoKm,
  type EstoqueAlertaItem, type ManutencaoAlertItem, type CnhAlertItem, type DocumentoVencendoItem,
} from '../../hooks/useApi';

export function AlertasDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: alertasData } = useEstoqueAlertas();
  const { data: manutencoesData } = useManutencaoVencendo();
  const { data: cnhData } = useCnhVencendo();
  const { data: revisoesData } = useEquipamentosRevisoesVencendo();
  const { data: comprasKPIs } = useComprasKPIs();
  const { data: documentosData } = useDocumentosVencendo();
  const { data: pneusKPIs } = usePneusKPIs();
  const { data: proximosKm = [] } = useProximosManutencaoKm(1000);

  const alertas: EstoqueAlertaItem[] = alertasData ?? [];
  const manutencoes: ManutencaoAlertItem[] = manutencoesData ?? [];
  const cnhAlerts: CnhAlertItem[] = cnhData ?? [];
  const revisoes = revisoesData ?? [];
  const ocAtrasadas = comprasKPIs?.atrasadas ?? 0;
  const documentos: DocumentoVencendoItem[] = documentosData ?? [];
  const pneusEmAlerta = pneusKPIs?.alertas80 ?? 0;
  const alertCount = alertas.length + manutencoes.length + cnhAlerts.length + revisoes.length + ocAtrasadas + documentos.length + pneusEmAlerta + proximosKm.length;

  function nav(path: string) { setOpen(false); navigate(path); }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Alertas do sistema"
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition"
      >
        <Bell size={20} className="text-gray-500" />
        {alertCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {alertCount > 99 ? '99+' : alertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Alertas do Sistema</h3>
            {alertCount > 0 && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                {alertCount} {alertCount === 1 ? 'alerta' : 'alertas'}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alertCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Bell size={24} className="mb-2 opacity-40" />
                <p className="text-xs">Nenhum alerta no momento</p>
              </div>
            ) : (
              <>
                {alertas.length > 0 && (
                  <>
                    <SectionHeader icon={<Package size={11} className="text-gray-400" />} label="Estoque crítico" count={alertas.length} countCls="text-amber-600" />
                    {alertas.slice(0, 5).map((m) => {
                      const qtd = m.estoques?.[0]?.quantidade ?? 0;
                      const critico = qtd === 0;
                      return (
                        <div key={m.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${critico ? 'bg-red-50/40' : ''}`}>
                          <AlertTriangle size={13} className={`mt-0.5 flex-shrink-0 ${critico ? 'text-red-500' : 'text-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{m.nome}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Qtd: <span className={`font-semibold ${critico ? 'text-red-600' : 'text-amber-600'}`}>{qtd}</span>{' '}
                              {m.unidadeMedida} · mín: {m.estoqueMinimo}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {alertas.length > 5 && <MoreButton onClick={() => nav('/estoque')} label={`+ ${alertas.length - 5} itens no estoque`} />}
                  </>
                )}

                {manutencoes.length > 0 && (
                  <>
                    <SectionHeader icon={<Wrench size={11} className="text-gray-400" />} label="Manutenção próxima" count={manutencoes.length} countCls="text-orange-600" />
                    {manutencoes.slice(0, 5).map((c) => {
                      const dias = Math.ceil((new Date(c.proximaManutencao).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const urgente = dias <= 7;
                      return (
                        <div key={c.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${urgente ? 'bg-orange-50/40' : ''}`}>
                          <Wrench size={13} className={`mt-0.5 flex-shrink-0 ${urgente ? 'text-orange-500' : 'text-blue-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{c.codigo} — {c.modelo}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(c.proximaManutencao).toLocaleDateString('pt-BR')}
                              <span className={`font-semibold ml-1 ${urgente ? 'text-orange-600' : 'text-gray-600'}`}>
                                ({dias <= 0 ? 'vencida!' : `em ${dias}d`})
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {manutencoes.length > 5 && <MoreButton onClick={() => nav('/frota')} label={`+ ${manutencoes.length - 5} caminhões na frota`} />}
                  </>
                )}

                {cnhAlerts.length > 0 && (
                  <>
                    <SectionHeader icon={<Car size={11} className="text-gray-400" />} label="CNH vencendo" count={cnhAlerts.length} countCls="text-red-600" />
                    {cnhAlerts.slice(0, 5).map((f) => {
                      const diff = Math.ceil((new Date(f.cnhValidade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const vencida = diff < 0;
                      return (
                        <div key={f.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${vencida ? 'bg-red-50/40' : 'bg-amber-50/20'}`}>
                          <Car size={13} className={`mt-0.5 flex-shrink-0 ${vencida ? 'text-red-500' : 'text-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{f.nome}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              CNH {f.cnhCategoria ?? '—'} ·{' '}
                              {vencida
                                ? <span className="text-red-600 font-semibold">Vencida há {Math.abs(diff)}d</span>
                                : <span className="text-amber-600 font-semibold">Vence em {diff}d</span>
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {cnhAlerts.length > 5 && <MoreButton onClick={() => nav('/funcionarios')} label={`+ ${cnhAlerts.length - 5} motoristas`} />}
                  </>
                )}

                {revisoes.length > 0 && (
                  <>
                    <SectionHeader icon={<Wrench size={11} className="text-gray-400" />} label="Revisões vencendo" count={revisoes.length} countCls="text-purple-600" />
                    {revisoes.slice(0, 5).map((eq) => (
                      <div key={eq.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${eq.vencida ? 'bg-red-50/40' : ''}`}>
                        <Wrench size={13} className={`mt-0.5 flex-shrink-0 ${eq.vencida ? 'text-red-500' : 'text-purple-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{eq.nome}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {eq.diasRestantes !== null
                              ? eq.diasRestantes <= 0
                                ? <span className="text-red-600 font-semibold">Vencida</span>
                                : <span className="text-purple-600 font-semibold">em {eq.diasRestantes}d</span>
                              : '—'
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                    {revisoes.length > 5 && <MoreButton onClick={() => nav('/equipamentos')} label={`+ ${revisoes.length - 5} equipamentos`} />}
                  </>
                )}

                {ocAtrasadas > 0 && (
                  <>
                    <SectionHeader icon={<ShoppingCart size={11} className="text-gray-400" />} label="OCs Atrasadas" count={ocAtrasadas} countCls="text-red-600" />
                    <button
                      onClick={() => nav('/compras?atrasada=1')}
                      className="w-full px-4 py-3 border-b border-gray-50 flex items-start gap-3 bg-red-50/20 hover:bg-red-50 transition"
                    >
                      <ShoppingCart size={13} className="mt-0.5 flex-shrink-0 text-red-500" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-gray-800">
                          {ocAtrasadas} {ocAtrasadas === 1 ? 'OC com prazo vencido' : 'OCs com prazo vencido'}
                        </p>
                        <p className="text-[11px] text-red-600 font-semibold mt-0.5">Clique para ver →</p>
                      </div>
                    </button>
                  </>
                )}

                {documentos.length > 0 && (
                  <>
                    <SectionHeader icon={<AlertTriangle size={11} className="text-gray-400" />} label="Documentos vencendo" count={documentos.length} countCls="text-red-600" />
                    {documentos.slice(0, 5).map((d) => {
                      const crlvDias = d.vencimentoCrlv ? Math.ceil((new Date(d.vencimentoCrlv).getTime() - Date.now()) / 86400000) : null;
                      const seguroDias = d.vencimentoSeguro ? Math.ceil((new Date(d.vencimentoSeguro).getTime() - Date.now()) / 86400000) : null;
                      const minDias = [crlvDias, seguroDias].filter((x) => x !== null).reduce((a, b) => Math.min(a!, b!), Infinity);
                      return (
                        <div key={d.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${minDias! < 0 ? 'bg-red-50/40' : ''}`}>
                          <AlertTriangle size={13} className={`mt-0.5 flex-shrink-0 ${minDias! < 0 ? 'text-red-500' : 'text-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{d.codigo} — {d.modelo}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {crlvDias !== null && <span className={crlvDias < 0 ? 'text-red-600 font-semibold' : 'text-amber-600'}>CRLV: {crlvDias < 0 ? 'vencido' : `${crlvDias}d`}</span>}
                              {crlvDias !== null && seguroDias !== null && ' · '}
                              {seguroDias !== null && <span className={seguroDias < 0 ? 'text-red-600 font-semibold' : 'text-amber-600'}>Seg: {seguroDias < 0 ? 'vencido' : `${seguroDias}d`}</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {documentos.length > 5 && <MoreButton onClick={() => nav('/frota')} label={`+ ${documentos.length - 5} caminhões`} />}
                  </>
                )}

                {pneusEmAlerta > 0 && (
                  <>
                    <SectionHeader icon={<CircleDot size={11} className="text-gray-400" />} label="Pneus em alerta" count={pneusEmAlerta} countCls={(pneusKPIs?.alertas95 ?? 0) > 0 ? 'text-red-600' : 'text-amber-600'} />
                    <button
                      onClick={() => nav('/relatorios?tab=Pneus')}
                      className={`w-full px-4 py-3 border-b border-gray-50 flex items-start gap-3 hover:bg-amber-50 transition ${(pneusKPIs?.alertas95 ?? 0) > 0 ? 'bg-red-50/20' : 'bg-amber-50/20'}`}
                    >
                      <CircleDot size={13} className={`mt-0.5 flex-shrink-0 ${(pneusKPIs?.alertas95 ?? 0) > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-medium text-gray-800">
                          {pneusEmAlerta} pneu{pneusEmAlerta !== 1 ? 's' : ''} com ≥ 80% de desgaste
                          {(pneusKPIs?.alertas95 ?? 0) > 0 && <span className="text-red-600 font-semibold ml-1">({pneusKPIs?.alertas95} urgente{pneusKPIs?.alertas95 !== 1 ? 's' : ''})</span>}
                        </p>
                        <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Ver relatório de pneus →</p>
                      </div>
                    </button>
                  </>
                )}

                {proximosKm.length > 0 && (
                  <>
                    <SectionHeader icon={<Gauge size={11} className="text-gray-400" />} label="Manutenção por KM" count={proximosKm.length} countCls={proximosKm.some((c) => c.urgente) ? 'text-red-600' : 'text-amber-600'} />
                    {proximosKm.slice(0, 5).map((c) => (
                      <div key={c.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${c.urgente ? 'bg-red-50/40' : ''}`}>
                        <Gauge size={13} className={`mt-0.5 flex-shrink-0 ${c.urgente ? 'text-red-500' : 'text-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{c.codigo} — {c.modelo}</p>
                          <p className={`text-[11px] mt-0.5 font-semibold ${c.urgente ? 'text-red-600' : 'text-amber-600'}`}>
                            {c.urgente ? 'KM de manutenção ultrapassado!' : `${c.kmRestantes.toLocaleString('pt-BR')} km restantes`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {proximosKm.length > 5 && <MoreButton onClick={() => nav('/frota')} label={`+ ${proximosKm.length - 5} caminhões`} />}
                  </>
                )}
              </>
            )}
          </div>

          {alertCount > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 flex gap-3 flex-wrap">
              {alertas.length > 0 && <FooterLink onClick={() => nav('/estoque')} label="Ir ao Estoque →" cls="text-amber-600 hover:text-amber-700" />}
              {manutencoes.length > 0 && <FooterLink onClick={() => nav('/frota')} label="Ir à Frota →" cls="text-blue-600 hover:text-blue-700" />}
              {cnhAlerts.length > 0 && <FooterLink onClick={() => nav('/funcionarios')} label="Ver CNH →" cls="text-red-600 hover:text-red-700" />}
              {revisoes.length > 0 && <FooterLink onClick={() => nav('/equipamentos')} label="Equipamentos →" cls="text-purple-600 hover:text-purple-700" />}
              {ocAtrasadas > 0 && <FooterLink onClick={() => nav('/compras?atrasada=1')} label="OCs Atrasadas →" cls="text-red-600 hover:text-red-700" />}
              {documentos.length > 0 && <FooterLink onClick={() => nav('/frota')} label="Ver Frota →" cls="text-amber-600 hover:text-amber-700" />}
              {pneusEmAlerta > 0 && <FooterLink onClick={() => nav('/relatorios?tab=Pneus')} label="Pneus →" cls="text-amber-600 hover:text-amber-700" />}
              {proximosKm.length > 0 && <FooterLink onClick={() => nav('/frota')} label="KM Manutenção →" cls="text-amber-600 hover:text-amber-700" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, count, countCls }: { icon: React.ReactNode; label: string; count: number; countCls: string }) {
  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 border-t flex items-center gap-2">
      {icon}
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`ml-auto text-[11px] font-medium ${countCls}`}>{count}</span>
    </div>
  );
}

function MoreButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full px-4 py-2 text-[11px] text-blue-600 hover:bg-blue-50 text-left transition">
      {label} →
    </button>
  );
}

function FooterLink({ onClick, label, cls }: { onClick: () => void; label: string; cls: string }) {
  return (
    <button onClick={onClick} className={`flex-1 text-xs font-medium text-center ${cls}`}>
      {label}
    </button>
  );
}
