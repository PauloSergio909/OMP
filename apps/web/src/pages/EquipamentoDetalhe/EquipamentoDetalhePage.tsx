import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wrench, Edit, ArrowLeftRight,
  AlertTriangle, MapPin, Hash, DollarSign, Calendar, User,
  Tag, Clock, Download,
} from 'lucide-react';
import { exportCsv } from '../../utils/exportCsv';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CopyText } from '../../components/ui/CopyText';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { RelDate } from '../../components/ui/RelDate';
import { useEquipamentoDetalhe } from '../../hooks/useApi';
import { tipoLabels, tipoIcons, statusColors, movTipoLabels, movTipoColors, revisaoStatus } from './equipamento-detalhe.constants';
import { EditarEquipamentoDetalheModal } from './EditarEquipamentoDetalheModal';
import { MovimentarEquipamentoDetalheModal } from './MovimentarEquipamentoDetalheModal';

export function EquipamentoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalEdit, setModalEdit] = useState(false);
  const [movId, setMovId] = useState<string | null>(null);

  const { data: equipamento, isLoading, isError } = useEquipamentoDetalhe(id ?? '');
  usePageTitle(equipamento?.nome ?? 'Equipamento');

  if (isLoading) return <DetailPageSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar dados do equipamento.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
      </div>
    );
  }

  if (!equipamento) {
    return <div className="text-center py-20"><p className="text-gray-400">Equipamento não encontrado.</p></div>;
  }

  const Icon = tipoIcons[equipamento.tipo] ?? Wrench;
  const rev = revisaoStatus(equipamento.proximaRevisao);
  const diasRev = equipamento.proximaRevisao
    ? Math.abs(Math.ceil((new Date(equipamento.proximaRevisao).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[{ label: 'Equipamentos', href: '/equipamentos' }, { label: equipamento.nome }]} />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate('/equipamentos')} aria-label="Voltar para equipamentos" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">{equipamento.nome}</h1>
          <button onClick={() => setMovId(equipamento.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <ArrowLeftRight size={14} /> Movimentar
          </button>
          <button onClick={() => setModalEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <Edit size={14} /> Editar
          </button>
        </div>
      </div>

      {(rev === 'vencida' || rev === 'vencendo') && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${rev === 'vencida' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={18} className={`flex-shrink-0 ${rev === 'vencida' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${rev === 'vencida' ? 'text-red-700' : 'text-amber-700'}`}>
              {rev === 'vencida' ? `Revisão vencida há ${diasRev} dia${diasRev !== 1 ? 's' : ''}` : `Revisão vence em ${diasRev} dia${diasRev !== 1 ? 's' : ''}`}
            </p>
            <p className={`text-xs mt-0.5 ${rev === 'vencida' ? 'text-red-500' : 'text-amber-600'}`}>
              {rev === 'vencida' ? 'Agende a revisão imediatamente para manter a conformidade.' : 'Agende a revisão antes do vencimento.'}
            </p>
          </div>
          <button onClick={() => setModalEdit(true)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${rev === 'vencida' ? 'border-red-300 text-red-700 hover:bg-red-100' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
            Atualizar revisão →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card principal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Icon size={26} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{equipamento.nome}</h2>
              <p className="text-sm text-gray-500">{tipoLabels[equipamento.tipo] ?? equipamento.tipo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[equipamento.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {equipamento.status === 'disponivel' ? 'Disponível' : equipamento.status === 'em_uso' ? 'Em uso' : equipamento.status === 'manutencao' ? 'Manutenção' : 'Descartado'}
                </span>
                {!equipamento.ativo && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inativo</span>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Hash size={14} className="text-gray-400 shrink-0" />
              <CopyText text={equipamento.codigo} className="font-mono text-xs font-medium text-blue-600" />
            </div>
            {equipamento.numeroSerie && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <Tag size={14} className="text-gray-400 shrink-0" />
                <CopyText text={equipamento.numeroSerie} className="text-xs font-mono" />
              </div>
            )}
            {equipamento.localizacao && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm">{equipamento.localizacao}</span>
              </div>
            )}
            {equipamento.responsavel && (
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <User size={14} className="text-gray-400 shrink-0" />
                <div>
                  <button onClick={() => navigate(`/funcionarios/${equipamento.responsavel!.id}`)} className="text-sm font-medium text-gray-800 hover:text-blue-600 transition text-left">
                    {equipamento.responsavel.nome}
                  </button>
                  <p className="text-xs text-gray-400">{equipamento.responsavel.cargo}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Especificações */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Wrench size={15} className="text-blue-500" /> Especificações
          </h3>
          <div className="space-y-3">
            {equipamento.fabricante && <div><p className="text-xs text-gray-400 mb-0.5">Fabricante</p><p className="text-sm font-medium text-gray-800">{equipamento.fabricante}</p></div>}
            {equipamento.modelo && <div><p className="text-xs text-gray-400 mb-0.5">Modelo</p><p className="text-sm font-medium text-gray-800">{equipamento.modelo}</p></div>}
            {equipamento.dataAquisicao && (
              <div className="flex items-center gap-2.5">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <div><p className="text-xs text-gray-400">Aquisição</p><p className="text-sm text-gray-700"><RelDate date={equipamento.dataAquisicao!} /></p></div>
              </div>
            )}
            {equipamento.valorAquisicao != null && (
              <div className="flex items-center gap-2.5">
                <DollarSign size={14} className="text-gray-400 shrink-0" />
                <div><p className="text-xs text-gray-400">Valor</p><p className="text-sm font-semibold text-gray-800">R$ {equipamento.valorAquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
              </div>
            )}
            {!equipamento.fabricante && !equipamento.modelo && !equipamento.dataAquisicao && equipamento.valorAquisicao == null && (
              <p className="text-sm text-gray-400 italic">Sem especificações cadastradas</p>
            )}
          </div>
        </div>

        {/* Próxima revisão */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-blue-500" /> Próxima Revisão
          </h3>
          {equipamento.proximaRevisao ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Data prevista</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-800"><RelDate date={equipamento.proximaRevisao!} /></p>
                  {rev === 'vencida' && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Vencida</span>}
                  {rev === 'vencendo' && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Vencendo</span>}
                </div>
              </div>
              {rev !== 'ok' && (
                <button onClick={() => setModalEdit(true)} className="w-full text-xs font-medium py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition">
                  Agendar nova revisão →
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-400">Sem revisão agendada</p>
              <button onClick={() => setModalEdit(true)} className="text-xs font-medium py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">Agendar revisão →</button>
            </div>
          )}
          {equipamento.observacoes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Observações</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{equipamento.observacoes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de movimentações */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Histórico de Movimentações</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{equipamento.movimentacoes.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {equipamento.movimentacoes.length > 0 && (
              <button
                onClick={() => exportCsv(
                  `movimentacoes-${equipamento.codigo}`,
                  ['Data', 'Tipo', 'Responsável', 'Destino', 'Observações'],
                  equipamento.movimentacoes.map((m) => [
                    new Date(m.createdAt).toLocaleDateString('pt-BR'),
                    movTipoLabels[m.tipo] ?? m.tipo, m.responsavel?.nome ?? '—',
                    m.destino ?? '—', m.observacoes ?? '',
                  ]),
                )}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                <Download size={12} /> CSV
              </button>
            )}
            <button onClick={() => setMovId(equipamento.id)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition">
              <ArrowLeftRight size={12} /> Registrar
            </button>
          </div>
        </div>
        {equipamento.movimentacoes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ArrowLeftRight size={24} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhuma movimentação registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tipo', 'Responsável', 'Destino', 'Data', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {equipamento.movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${movTipoColors[mov.tipo] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{movTipoLabels[mov.tipo] ?? mov.tipo}</span>
                    </td>
                    <td className="px-5 py-3">
                      {mov.responsavel ? (
                        <button onClick={() => navigate(`/funcionarios/${mov.responsavel!.id}`)} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition text-left">{mov.responsavel.nome}</button>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{mov.destino ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-gray-500"><RelDate date={mov.createdAt} /></td>
                    <td className="px-5 py-3 text-sm text-gray-400 max-w-xs truncate">{mov.observacoes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditarEquipamentoDetalheModal open={modalEdit} onClose={() => setModalEdit(false)} equipamento={equipamento} />
      <MovimentarEquipamentoDetalheModal equipamentoId={movId} onClose={() => setMovId(null)} />
    </div>
  );
}
