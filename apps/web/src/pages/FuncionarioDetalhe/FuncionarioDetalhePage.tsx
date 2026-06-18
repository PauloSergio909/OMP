import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, Car, Wrench,
  ClipboardList, AlertTriangle, ExternalLink, Edit, Calendar, Fuel, Printer,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CopyText } from '../../components/ui/CopyText';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { RelDate } from '../../components/ui/RelDate';
import { printDocument } from '../../utils/printDocument';
import { buildFuncionarioHtml } from '../../utils/printTemplates';
import { useFuncionario } from '../../hooks/useApi';
import { cargoIcons, cargoLabels, cnhStatus } from './funcionario.constants';
import { EditarFuncionarioModal } from './EditarFuncionarioModal';

export function FuncionarioDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalEdit, setModalEdit] = useState(false);

  const { data: funcionario, isLoading, isError } = useFuncionario(id ?? '');
  usePageTitle(funcionario?.nome ?? '');

  if (isLoading) return <DetailPageSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar dados do funcionário.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
      </div>
    );
  }

  if (!funcionario) {
    return <div className="text-center py-20"><p className="text-gray-400">Funcionário não encontrado.</p></div>;
  }

  const Icon = cargoIcons[funcionario.cargo] ?? User;
  const cnh = cnhStatus(funcionario.cnhValidade);
  const diasCnh = funcionario.cnhValidade
    ? Math.abs(Math.ceil((new Date(funcionario.cnhValidade).getTime() - Date.now()) / 86400000))
    : 0;
  const caminhoes = funcionario.caminhoesMotorista ?? [];
  const ordens    = funcionario.ordensResponsavel ?? [];
  const osConcluidas = ordens.filter((o) => o.status === 'concluida').length;
  const osAbertas    = ordens.filter((o) => !['concluida', 'cancelada'].includes(o.status)).length;
  const osCanceladas = ordens.filter((o) => o.status === 'cancelada').length;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Funcionários', href: '/funcionarios' }, { label: funcionario.nome }]} />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate('/funcionarios')} aria-label="Voltar para funcionários" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">{funcionario.nome}</h1>
          <button
            onClick={() => printDocument(buildFuncionarioHtml({ ...funcionario, caminhoesMotorista: funcionario.caminhoesMotorista ?? [], ordensResponsavel: funcionario.ordensResponsavel ?? [] }), `Ficha — ${funcionario.nome}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            title="Imprimir / Salvar como PDF"
          >
            <Printer size={14} />
          </button>
          <button onClick={() => setModalEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <Edit size={14} /> Editar
          </button>
        </div>
      </div>

      {funcionario.cargo === 'motorista' && (cnh === 'vencida' || cnh === 'vencendo') && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${cnh === 'vencida' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={18} className={`flex-shrink-0 ${cnh === 'vencida' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${cnh === 'vencida' ? 'text-red-700' : 'text-amber-700'}`}>
              {cnh === 'vencida' ? `CNH vencida há ${diasCnh} dia${diasCnh !== 1 ? 's' : ''}` : `CNH vence em ${diasCnh} dia${diasCnh !== 1 ? 's' : ''}`}
            </p>
            <p className={`text-xs mt-0.5 ${cnh === 'vencida' ? 'text-red-500' : 'text-amber-600'}`}>
              {cnh === 'vencida' ? 'Motorista não pode conduzir veículos com CNH vencida.' : 'Renove a CNH antes do vencimento para evitar impedimentos.'}
            </p>
          </div>
          <button onClick={() => setModalEdit(true)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${cnh === 'vencida' ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
            Atualizar CNH →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card perfil */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Icon size={26} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{funcionario.nome}</h2>
              <p className="text-sm text-gray-500">{cargoLabels[funcionario.cargo] ?? funcionario.cargo}</p>
              <div className="mt-1"><StatusBadge status={funcionario.ativo ? 'ativo' : 'inativo'} /></div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <User size={14} className="text-gray-400 shrink-0" />
              <CopyText text={funcionario.cpf} className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <CopyText text={funcionario.telefone} className="text-sm" />
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <CopyText text={funcionario.email} className="text-sm break-all" />
            </div>
            {funcionario.dataAdmissao && (
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs">Admitido <RelDate date={funcionario.dataAdmissao!} /></span>
              </div>
            )}
          </div>
        </div>

        {/* CNH */}
        {funcionario.cargo === 'motorista' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Car size={15} className="text-blue-500" /> CNH
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Categoria</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funcionario.cnhCategoria ?? <span className="text-gray-300 text-base font-normal">Não informada</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Validade</p>
                {funcionario.cnhValidade ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800"><RelDate date={funcionario.cnhValidade!} /></p>
                    {cnh === 'vencida' && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle size={11} /> Vencida</span>}
                    {cnh === 'vencendo' && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle size={11} /> Vencendo</span>}
                  </div>
                ) : <p className="text-sm text-gray-400">Não informada</p>}
              </div>
            </div>
          </div>
        )}

        {/* Resumo de atividades */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumo de Atividades</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500 flex items-center gap-2"><Car size={13} className="text-gray-400" /> Caminhões vinculados</span>
              <span className="text-sm font-bold text-gray-900">{caminhoes.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500 flex items-center gap-2"><ClipboardList size={13} className="text-gray-400" /> OS responsável</span>
              <button onClick={() => navigate(`/ordens-servico?view=lista&responsavel=${funcionario.id}`)} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition" title="Ver ordens de serviço deste funcionário">
                {funcionario._count?.ordensResponsavel ?? ordens.length}
              </button>
            </div>
            {ordens.length > 0 && (
              <div className="py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate(`/ordens-servico?view=lista&responsavel=${funcionario.id}&status=concluida`)} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium hover:opacity-75 transition">{osConcluidas} concluída{osConcluidas !== 1 ? 's' : ''}</button>
                  <button onClick={() => navigate(`/ordens-servico?view=lista&responsavel=${funcionario.id}&status=aberta`)} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium hover:opacity-75 transition">{osAbertas} em aberto</button>
                  {osCanceladas > 0 && <button onClick={() => navigate(`/ordens-servico?view=lista&responsavel=${funcionario.id}&status=cancelada`)} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium hover:opacity-75 transition">{osCanceladas} cancelada{osCanceladas !== 1 ? 's' : ''}</button>}
                </div>
                {(funcionario._count?.ordensResponsavel ?? 0) > ordens.length && (
                  <p className="text-[10px] text-gray-400 mt-1">Distribuição baseada nas {ordens.length} OS mais recentes</p>
                )}
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500 flex items-center gap-2"><Edit size={13} className="text-gray-400" /> Acesso ao sistema</span>
              <span className="text-sm text-gray-600">{funcionario.user?.role ? <StatusBadge status={funcionario.user.role} /> : <span className="text-gray-300">—</span>}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Caminhões vinculados */}
      {caminhoes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Car size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Caminhões Vinculados</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{caminhoes.length}</span>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => navigate(`/abastecimento?motorista=${funcionario.id}`)} className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"><Fuel size={11} /> Abastecimentos →</button>
              <button onClick={() => navigate('/frota')} className="text-xs text-blue-600 hover:underline font-medium">Ver frota →</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Código', 'Placa', 'Modelo', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {caminhoes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/frota/${c.id}`)}>
                    <td className="px-5 py-3"><CopyText text={c.codigo} className="text-sm font-mono font-bold text-blue-600" /></td>
                    <td className="px-5 py-3"><CopyText text={c.placa} className="text-sm text-gray-700 font-mono" /></td>
                    <td className="px-5 py-3 text-sm text-gray-600">{c.modelo}</td>
                    <td className="px-5 py-3"><button onClick={(e) => { e.stopPropagation(); navigate(`/frota?status=${c.status}`); }} className="hover:opacity-75 transition"><StatusBadge status={c.status} /></button></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?caminhao=${c.id}`); }} className="text-xs font-medium text-blue-600 hover:underline transition opacity-0 group-hover:opacity-100">Ver OS</button>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/frota/${c.id}`); }} className="flex items-center gap-1 text-xs text-blue-500 font-medium hover:text-blue-700 transition opacity-0 group-hover:opacity-100"><ExternalLink size={11} /> Ver</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico de OS */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Ordens de Serviço</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ordens.length}</span>
          {(funcionario._count?.ordensResponsavel ?? 0) > ordens.length && (
            <span className="text-xs text-gray-400">· {funcionario._count!.ordensResponsavel} total</span>
          )}
        </div>
        {ordens.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma OS registrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Código', 'Caminhão', 'Tipo', 'Status', 'Abertura', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordens.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/ordens-servico/${os.id}`)}>
                    <td className="px-5 py-3"><CopyText text={os.codigo} className="text-sm font-mono font-bold text-blue-600" /></td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {os.caminhao ? (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/frota/${os.caminhao!.id}`); }} className="font-medium hover:text-blue-600 transition text-left">{os.caminhao.codigo}</button>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3"><button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&tipo=${os.tipo}`); }} className="hover:opacity-75 transition"><StatusBadge status={os.tipo} /></button></td>
                    <td className="px-5 py-3"><button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&status=${os.status}`); }} className="hover:opacity-75 transition"><StatusBadge status={os.status} /></button></td>
                    <td className="px-5 py-3 text-sm text-gray-500"><RelDate date={os.dataAbertura} /></td>
                    <td className="px-5 py-3"><span className="flex items-center gap-1 text-xs text-gray-300 group-hover:text-blue-500 font-medium transition"><ExternalLink size={11} /> Ver</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditarFuncionarioModal open={modalEdit} onClose={() => setModalEdit(false)} funcionario={funcionario} />
    </div>
  );
}
