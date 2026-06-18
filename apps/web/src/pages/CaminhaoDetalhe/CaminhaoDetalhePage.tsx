import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Gauge, Calendar, Wrench, Fuel,
  ClipboardList, TrendingUp, Edit, Plus, ExternalLink, AlertTriangle, FileText, Printer,
} from 'lucide-react';
import { printDocument } from '../../utils/printDocument';
import { buildCaminhaoHtml } from '../../utils/printTemplates';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CopyText } from '../../components/ui/CopyText';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { useCaminhaoDetalhe, useEficienciaCaminhao, type CaminhaoCustos } from '../../hooks/useApi';
import { RelDate } from '../../components/ui/RelDate';
import { CaminhaoPneus } from './CaminhaoPneus';
import { CaminhaoChecklists } from './CaminhaoChecklists';
import { EditarCaminhaoDetalheModal } from './EditarCaminhaoDetalheModal';
import { RegistrarKmModal } from './RegistrarKmModal';
import { CaminhaoPainelCustos } from './CaminhaoPainelCustos';
import { CaminhaoOsAbastecimentos } from './CaminhaoOsAbastecimentos';
import { CaminhaoHistoricoCombustivel } from './CaminhaoHistoricoCombustivel';
import { CaminhaoTimeline } from './CaminhaoTimeline';

interface DocCardProps {
  label: string;
  date: string;
  dias: number | null;
}

function DocCard({ label, date, dias }: DocCardProps) {
  const vencida  = dias !== null && dias < 0;
  const vencendo = dias !== null && dias <= 30 && dias >= 0;
  return (
    <div className={`p-3 rounded-xl border ${vencida ? 'bg-red-50 border-red-200' : vencendo ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">{label}</p>
      <p className={`text-sm font-bold ${vencida ? 'text-red-700' : vencendo ? 'text-amber-700' : 'text-gray-900'}`}>{date}</p>
      {dias !== null && <p className={`text-xs mt-0.5 ${dias < 0 ? 'text-red-500 font-medium' : dias <= 30 ? 'text-amber-600' : 'text-gray-400'}`}>{dias < 0 ? `Vencido há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`}</p>}
    </div>
  );
}

export function CaminhaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalEdit, setModalEdit] = useState(false);
  const [modalKm, setModalKm] = useState(false);

  const { data: caminhao, isLoading, isError } = useCaminhaoDetalhe(id ?? '');
  usePageTitle(caminhao ? `${caminhao.codigo} — ${caminhao.fabricante} ${caminhao.modelo}` : '');
  const { data: eficiencia } = useEficienciaCaminhao(id);

  const kmData = useMemo(() =>
    [...(caminhao?.kmRegistros ?? [])]
      .reverse()
      .map((r) => ({
        id: r.id,
        km: r.km,
        data: new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dataCompleta: new Date(r.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })),
  [caminhao?.kmRegistros]);

  if (isLoading) return <DetailPageSkeleton />;
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar dados do caminhão.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
        <button onClick={() => navigate('/frota')} className="text-sm text-blue-600 hover:underline mt-1">Voltar para a frota</button>
      </div>
    );
  }
  if (!caminhao) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-gray-500">Caminhão não encontrado.</p>
        <button onClick={() => navigate('/frota')} className="text-sm text-blue-600 hover:underline">Voltar para a frota</button>
      </div>
    );
  }

  const manutencaoVencida  = caminhao.proximaManutencao ? new Date(caminhao.proximaManutencao) < new Date() : false;
  const manutencaoVencendo = !manutencaoVencida && caminhao.proximaManutencao ? new Date(caminhao.proximaManutencao) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false;
  const diasManutencao     = caminhao.proximaManutencao ? Math.abs(Math.ceil((new Date(caminhao.proximaManutencao).getTime() - Date.now()) / 86400000)) : 0;
  const kmManutRestante    = caminhao.proximaManutencaoKm != null ? caminhao.proximaManutencaoKm - caminhao.kmAtual : null;
  const kmManutUrgente     = kmManutRestante !== null && kmManutRestante <= 0;
  const kmManutAlerta      = kmManutRestante !== null && kmManutRestante > 0 && kmManutRestante <= 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb items={[{ label: 'Frota', href: '/frota' }, { label: `${caminhao.codigo} — ${caminhao.fabricante} ${caminhao.modelo}` }]} />
        <div className="flex items-center gap-4 mt-2">
          <button onClick={() => navigate('/frota')} aria-label="Voltar para a frota" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CopyText text={caminhao.codigo} className="text-lg font-bold text-gray-900" />
              <button onClick={() => navigate(`/frota?status=${caminhao.status}`)} className="hover:opacity-75 transition" title={`Ver frota com status ${caminhao.status}`}>
                <StatusBadge status={caminhao.status} />
              </button>
            </div>
            <p className="text-sm text-gray-500">{caminhao.fabricante} {caminhao.modelo} — <CopyText text={caminhao.placa} className="font-medium text-gray-600" /></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => printDocument(buildCaminhaoHtml({ ...(caminhao as Parameters<typeof buildCaminhaoHtml>[0]), mediaKmL: eficiencia?.mediaKmL ?? null }), `Ficha — ${caminhao.codigo}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition" aria-label="Imprimir ficha técnica" title="Imprimir / Salvar como PDF">
              <Printer size={14} />
            </button>
            <button onClick={() => setModalKm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              <Plus size={14} /> Registrar KM
            </button>
            <button onClick={() => navigate(`/ordens-servico?caminhao=${id}&openNew=1`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition" title="Criar nova OS para este caminhão">
              <ClipboardList size={14} /> Nova OS
            </button>
            <button onClick={() => setModalEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
              <Edit size={14} /> Editar
            </button>
          </div>
        </div>
      </div>

      {/* Banners */}
      {(manutencaoVencida || manutencaoVencendo) && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${manutencaoVencida ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={18} className={`flex-shrink-0 ${manutencaoVencida ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${manutencaoVencida ? 'text-red-700' : 'text-amber-700'}`}>
              {manutencaoVencida ? `Manutenção vencida há ${diasManutencao} dia${diasManutencao !== 1 ? 's' : ''}` : `Manutenção prevista em ${diasManutencao} dia${diasManutencao !== 1 ? 's' : ''}`}
            </p>
            <p className={`text-xs mt-0.5 ${manutencaoVencida ? 'text-red-500' : 'text-amber-600'}`}>
              {manutencaoVencida ? 'Agende uma OS preventiva ou atualize a data de manutenção.' : 'Verifique e agende a manutenção preventiva antes do vencimento.'}
            </p>
          </div>
          <button onClick={() => navigate(`/ordens-servico?caminhao=${id}&tipo=preventiva`)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${manutencaoVencida ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
            Ver OS →
          </button>
        </div>
      )}
      {(kmManutUrgente || kmManutAlerta) && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${kmManutUrgente ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <Gauge size={18} className={kmManutUrgente ? 'text-red-500' : 'text-orange-500'} />
          <p className={`text-sm font-medium flex-1 ${kmManutUrgente ? 'text-red-700' : 'text-orange-700'}`}>
            {kmManutUrgente
              ? `KM de manutenção ultrapassado há ${Math.abs(kmManutRestante!).toLocaleString('pt-BR')} km. Agende uma OS preventiva.`
              : `A ${kmManutRestante!.toLocaleString('pt-BR')} km da manutenção programada (${caminhao.proximaManutencaoKm!.toLocaleString('pt-BR')} km).`}
          </p>
          <button onClick={() => navigate(`/ordens-servico?caminhao=${id}&tipo=preventiva`)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${kmManutUrgente ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-orange-300 text-orange-700 hover:bg-orange-100'}`}>
            Ver OS →
          </button>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><Gauge size={16} className="text-blue-500" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quilometragem</span></div>
          <p className="text-2xl font-bold text-gray-900">{caminhao.kmAtual.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-400 mt-0.5">km registrados</p>
          {eficiencia?.mediaKmL != null && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
              <Fuel size={12} className="text-amber-500" />
              <span className="text-xs font-semibold text-gray-700">{eficiencia.mediaKmL.toFixed(2)} km/L</span>
              <span className="text-[11px] text-gray-400">eficiência média</span>
            </div>
          )}
        </div>
        {caminhao.motorista ? (
          <button className="bg-white rounded-2xl border border-gray-100 p-5 text-left w-full hover:border-blue-200 transition group" onClick={() => navigate(`/funcionarios/${caminhao.motorista!.id}`)} title="Ver perfil do motorista">
            <div className="flex items-center gap-2 mb-2"><User size={16} className="text-green-500" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motorista</span><ExternalLink size={11} className="ml-auto text-gray-300 group-hover:text-blue-400 transition" /></div>
            <p className="text-base font-bold text-gray-900">{caminhao.motorista.nome}</p>
            {caminhao.motorista.cnhCategoria && <p className="text-xs text-gray-400 mt-0.5">CNH {caminhao.motorista.cnhCategoria}</p>}
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-2"><User size={16} className="text-green-500" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Motorista</span></div>
            <p className="text-base text-gray-400 font-normal italic">Sem motorista</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2"><Calendar size={16} className="text-amber-500" /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ano de Fabricação</span></div>
          <p className="text-2xl font-bold text-gray-900">{caminhao.anoFabricacao}</p>
          <p className="text-xs text-gray-400 mt-0.5">Chassi: <CopyText text={caminhao.chassi} className="font-mono" /></p>
        </div>
        <div className={`rounded-2xl border p-5 ${manutencaoVencida ? 'bg-red-50 border-red-200' : manutencaoVencendo ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={16} className={manutencaoVencida ? 'text-red-500' : manutencaoVencendo ? 'text-amber-500' : 'text-red-500'} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${manutencaoVencida ? 'text-red-600' : manutencaoVencendo ? 'text-amber-600' : 'text-gray-500'}`}>Próx. Manutenção</span>
          </div>
          <p className={`text-base font-bold ${manutencaoVencida ? 'text-red-700' : manutencaoVencendo ? 'text-amber-700' : 'text-gray-900'}`}>
            {caminhao.proximaManutencao ? <RelDate date={caminhao.proximaManutencao!} /> : <span className="text-gray-400 font-normal italic">Não agendada</span>}
          </p>
          {manutencaoVencida && <p className="text-xs text-red-500 mt-1 font-medium">Vencida — agende já</p>}
          {manutencaoVencendo && <p className="text-xs text-amber-600 mt-1">Agende em breve</p>}
          {caminhao.proximaManutencaoKm && (() => {
            const kmAlvo = caminhao.proximaManutencaoKm!;
            const kmBase = Math.max(0, kmAlvo - 10000);
            const pct = Math.min(100, Math.max(0, Math.round(((caminhao.kmAtual - kmBase) / (kmAlvo - kmBase)) * 100)));
            const kmRestante = kmAlvo - caminhao.kmAtual;
            const cor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
            return (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>{caminhao.kmAtual.toLocaleString('pt-BR')} km</span>
                  <span className={kmRestante <= 0 ? 'text-red-600 font-bold' : ''}>{kmRestante <= 0 ? `${Math.abs(kmRestante).toLocaleString('pt-BR')} km ultrapassado` : `${kmRestante.toLocaleString('pt-BR')} km restantes`}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} /></div>
                <p className="text-[11px] text-gray-400 mt-1">Meta: {kmAlvo.toLocaleString('pt-BR')} km ({pct}%)</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Documentação */}
      {(caminhao.vencimentoCrlv || caminhao.vencimentoSeguro || caminhao.numeroSeguro) && (() => {
        const hoje = new Date();
        const crlvDias   = caminhao.vencimentoCrlv   ? Math.ceil((new Date(caminhao.vencimentoCrlv).getTime()   - hoje.getTime()) / 86400000) : null;
        const seguroDias = caminhao.vencimentoSeguro ? Math.ceil((new Date(caminhao.vencimentoSeguro).getTime() - hoje.getTime()) / 86400000) : null;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={15} className="text-blue-500" /> Documentação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {caminhao.vencimentoCrlv && (
                <DocCard label="CRLV" date={new Date(caminhao.vencimentoCrlv).toLocaleDateString('pt-BR')} dias={crlvDias} />
              )}
              {caminhao.vencimentoSeguro && (
                <DocCard label="Seguro" date={new Date(caminhao.vencimentoSeguro).toLocaleDateString('pt-BR')} dias={seguroDias} />
              )}
              {caminhao.numeroSeguro && (
                <div className="p-3 rounded-xl border bg-gray-50 border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Nº Apólice</p>
                  <CopyText text={caminhao.numeroSeguro} className="text-sm font-mono text-gray-900" />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {caminhao.custos && <CaminhaoPainelCustos custos={caminhao.custos as CaminhaoCustos} id={id!} />}

      <CaminhaoOsAbastecimentos id={id!} ordensServico={caminhao.ordensServico ?? []} abastecimentos={caminhao.abastecimentos ?? []} />

      <CaminhaoHistoricoCombustivel id={id!} />

      {/* Histórico de KM */}
      {kmData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900">Histórico de Quilometragem</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{kmData.length} registros</span>
          </div>
          <div className="px-5 pt-5 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={kmData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString('pt-BR')} km`, 'Quilometragem']} labelFormatter={(label) => { const reg = kmData.find((r) => r.data === label); return reg?.dataCompleta ?? label; }} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="km" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-50"><th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-2.5">Data / Hora</th><th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-2.5">KM</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {kmData.slice(-10).reverse().map((km) => (
                  <tr key={km.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-2.5 text-sm text-gray-600">{km.dataCompleta}</td>
                    <td className="px-5 py-2.5 text-sm font-semibold text-gray-900">{km.km.toLocaleString('pt-BR')} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CaminhaoPneus caminhaoId={id!} kmAtual={caminhao.kmAtual} />
      <CaminhaoChecklists caminhaoId={id!} caminhao={caminhao} />
      <CaminhaoTimeline id={id!} />

      <EditarCaminhaoDetalheModal open={modalEdit} onClose={() => setModalEdit(false)} caminhao={caminhao} />
      <RegistrarKmModal open={modalKm} onClose={() => setModalKm(false)} caminhaoId={id!} kmAtual={caminhao.kmAtual} />
    </div>
  );
}
