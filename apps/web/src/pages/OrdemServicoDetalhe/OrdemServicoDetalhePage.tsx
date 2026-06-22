import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Truck, User, Calendar, DollarSign, Clock, Printer,
  Plus, AlertCircle, XCircle, History, Copy, Edit2,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CopyText } from '../../components/ui/CopyText';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { printDocument } from '../../utils/printDocument';
import { buildOSHtml } from '../../utils/printTemplates';
import { RelDate } from '../../components/ui/RelDate';
import { useOrdemServicoDetalhe, useDuplicarOS } from '../../hooks/useApi';
import { timelineSteps } from './os.constants';
import { EditarOSModal } from './EditarOSModal';
import { AtualizarStatusModal } from './AtualizarStatusModal';
import { AdicionarItemModal } from './AdicionarItemModal';
import { OSItensTabela } from './OSItensTabela';

export function OrdemServicoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalItem, setModalItem]       = useState(false);
  const [modalStatus, setModalStatus]   = useState(false);
  const [modalEditar, setModalEditar]   = useState(false);

  const { data: os, isLoading, isError } = useOrdemServicoDetalhe(id!);
  usePageTitle(os?.codigo ?? '');
  const duplicarOS = useDuplicarOS();

  if (isLoading) return <DetailPageSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar a ordem de serviço.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
        <button onClick={() => navigate('/ordens-servico')} className="mt-1 text-xs text-blue-600 hover:underline">Voltar para a lista</button>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-sm">Ordem de serviço não encontrada</p>
        <button onClick={() => navigate('/ordens-servico')} className="mt-3 text-xs text-blue-600 hover:underline">Voltar para a lista</button>
      </div>
    );
  }

  const isFinalizada = ['concluida', 'cancelada'].includes(os.status);
  const custoItens   = (os.itens ?? []).reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0);
  const isAtrasada   = !isFinalizada && new Date(os.dataPrevisao) < new Date();
  const diasAtraso   = isAtrasada ? Math.ceil((Date.now() - new Date(os.dataPrevisao).getTime()) / 86400000) : 0;
  const diasAberta   = Math.ceil((Date.now() - new Date(os.dataAbertura).getTime()) / 86400000);
  const currentStepIdx = timelineSteps.findIndex((s) => s.value === os.status);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div>
        <Breadcrumb items={[{ label: 'Ordens de Serviço', href: '/ordens-servico' }, { label: os.codigo }]} />
        <div className="flex items-start gap-4 mt-2">
          <button onClick={() => navigate('/ordens-servico')} aria-label="Voltar" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500 flex-shrink-0 mt-0.5 print:hidden">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <CopyText text={os.codigo} className="text-lg font-mono font-bold text-blue-600" />
              <button onClick={() => navigate(`/ordens-servico?view=lista&tipo=${os.tipo}`)} className="hover:opacity-75 transition" title={`Ver todas as OS do tipo ${os.tipo}`}><StatusBadge status={os.tipo} /></button>
              <button onClick={() => navigate(`/ordens-servico?view=lista&status=${os.status}`)} className="hover:opacity-75 transition" title={`Ver todas as OS com status ${os.status}`}><StatusBadge status={os.status} /></button>
              <button onClick={() => navigate(`/ordens-servico?view=lista&prioridade=${os.prioridade}`)} className="hover:opacity-75 transition" title={`Ver todas as OS com prioridade ${os.prioridade}`}><StatusBadge status={os.prioridade} /></button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{os.descricao}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            <button onClick={() => printDocument(buildOSHtml(os), `OS ${os.codigo} — Controle OMP`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition" aria-label="Imprimir / Salvar PDF">
              <Printer size={14} />
            </button>
            <button
              onClick={async () => { const nova = await duplicarOS.mutateAsync(id!); navigate(`/ordens-servico/${nova.id}`); }}
              disabled={duplicarOS.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              title="Criar cópia desta OS (status agendada, previsão +7 dias)"
            >
              <Copy size={14} /> Duplicar
            </button>
            {!isFinalizada && (
              <>
                <button onClick={() => setModalEditar(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => setModalStatus(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                  <Clock size={14} /> Atualizar Status
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isAtrasada && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5 print:hidden">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">OS atrasada há {diasAtraso} dia{diasAtraso !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-500 mt-0.5">
              Previsão era <RelDate date={os.dataPrevisao} />. Verifique o andamento com o responsável.
            </p>
          </div>
        </div>
      )}

      {os.status === 'cancelada' ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
          <XCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">OS Cancelada</p>
          {os.observacoes && <p className="text-xs text-red-500 ml-1 italic truncate">"{os.observacoes}"</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-4">
          <div className="relative flex items-start justify-between">
            <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-gray-200" />
            {currentStepIdx > 0 && (
              <div className="absolute top-3.5 left-3.5 h-0.5 bg-green-400 transition-all" style={{ width: `${(currentStepIdx / (timelineSteps.length - 1)) * 100}%` }} />
            )}
            {timelineSteps.map((step, idx) => {
              const done = idx < currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <div key={step.value} className="flex flex-col items-center z-10 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition ${active ? 'border-blue-600 bg-blue-600 text-white' : done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-300'}`}>
                    {done ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-right">Aberta há {diasAberta} dia{diasAberta !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button type="button" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition text-left w-full" onClick={() => os.caminhao?.id && navigate(`/frota/${os.caminhao.id}`)}>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-blue-600" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Caminhão</p>
            <CopyText text={os.caminhao?.codigo ?? ''} className="text-sm font-bold text-gray-900 truncate" />
            <p className="text-xs text-gray-500 truncate">{os.caminhao?.modelo}</p>
          </div>
          <ArrowLeft size={12} className="text-blue-400 rotate-180 flex-shrink-0" />
        </button>
        <button type="button" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:border-green-200 hover:bg-green-50/30 transition text-left w-full" onClick={() => os.responsavel?.id && navigate(`/funcionarios/${os.responsavel.id}`)}>
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><User size={18} className="text-green-600" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Responsável</p>
            <p className="text-sm font-bold text-gray-900 truncate">{os.responsavel?.nome}</p>
            <StatusBadge status={os.responsavel?.cargo ?? ''} />
          </div>
          <ArrowLeft size={12} className="text-green-400 rotate-180 flex-shrink-0" />
        </button>
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${isAtrasada ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isAtrasada ? 'bg-red-100' : 'bg-amber-50'}`}><Calendar size={18} className={isAtrasada ? 'text-red-500' : 'text-amber-600'} /></div>
          <div>
            <p className="text-xs text-gray-400">Previsão</p>
            <p className={`text-sm font-bold ${isAtrasada ? 'text-red-700' : 'text-gray-900'}`}>
              <RelDate date={os.dataPrevisao} />
            </p>
            {isAtrasada
              ? <p className="text-xs text-red-500 font-medium">{diasAtraso}d de atraso</p>
              : <p className="text-xs text-gray-500">Aberta <RelDate date={os.dataAbertura} /></p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0"><DollarSign size={18} className="text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-400">Custo Total</p>
            <p className="text-sm font-bold text-gray-900">R$ {custoItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-500">{(os.itens ?? []).length} itens lançados</p>
          </div>
        </div>
      </div>

      <OSItensTabela os={os} isFinalizada={isFinalizada} custoItens={custoItens} onAdicionar={() => setModalItem(true)} />

      {os.observacoes && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Observações</h3>
          <p className="text-sm text-amber-800 leading-relaxed">{os.observacoes}</p>
        </div>
      )}

      {(os.historico ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <History size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Histórico</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{(os.historico ?? []).length}</span>
          </div>
          <div className="px-5 py-4">
            <ol className="relative border-l border-gray-200 space-y-5 ml-2">
              {(os.historico ?? []).map((h, idx) => (
                <li key={h.id} className="ml-5">
                  <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white ${idx === (os.historico ?? []).length - 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    {h.statusAnterior ? (
                      <><StatusBadge status={h.statusAnterior} /><ArrowLeft size={10} className="text-gray-400 rotate-180" /><StatusBadge status={h.statusNovo} /></>
                    ) : <StatusBadge status={h.statusNovo} />}
                    <span className="text-xs text-gray-400 ml-auto">{new Date(h.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{h.usuarioNome}</span>
                    {h.observacao && <span className="italic text-gray-400"> — {h.observacao}</span>}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <EditarOSModal open={modalEditar} onClose={() => setModalEditar(false)} os={os} />
      <AtualizarStatusModal open={modalStatus} onClose={() => setModalStatus(false)} osId={os.id} currentStatus={os.status} />
      <AdicionarItemModal open={modalItem} onClose={() => setModalItem(false)} osId={os.id} />
    </div>
  );
}
