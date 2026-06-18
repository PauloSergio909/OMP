import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { RelDate } from '../../components/ui/RelDate';
import { useOrdensServico, type OrdemServicoListItem } from '../../hooks/useApi';

type OSListItem = { status: string; dataPrevisao: string };
function isOSAtrasada(os: OSListItem) {
  if (['concluida', 'cancelada', 'orcamento'].includes(os.status)) return false;
  return new Date(os.dataPrevisao) < new Date();
}

export function OsRecentes() {
  const navigate = useNavigate();
  const { data: ordensData, isLoading } = useOrdensServico(1);
  const osRecentes: OrdemServicoListItem[] = (ordensData?.data ?? []).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Ordens de Serviço Recentes</h3>
        <button onClick={() => navigate('/ordens-servico')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          Ver todas <ArrowRight size={12} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {['Código', 'Caminhão', 'Responsável', 'Tipo', 'Status', 'Prioridade', 'Previsão'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableSkeleton rows={4} cols={7} />
            ) : osRecentes.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma OS registrada</td></tr>
            ) : osRecentes.map((os) => (
              <tr key={os.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/ordens-servico/${os.id}`)}>
                <td className="px-5 py-3"><CopyText text={os.codigo} className="text-sm font-mono font-semibold text-blue-600" /></td>
                <td className="px-5 py-3">
                  {os.caminhao ? (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/frota/${os.caminhao!.id}`); }} className="text-left group" title="Ver detalhes do veículo">
                      <CopyText text={os.caminhao.codigo} className="text-sm text-gray-700 group-hover:text-blue-600 transition font-medium" />
                      <p className="text-xs text-gray-400">{os.caminhao.modelo}</p>
                    </button>
                  ) : <span className="text-sm text-gray-400">—</span>}
                </td>
                <td className="px-5 py-3">
                  {os.responsavel ? (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${os.responsavel!.id}`); }} className="text-sm text-gray-600 hover:text-blue-600 transition text-left" title="Ver perfil do responsável">
                      {os.responsavel.nome}
                    </button>
                  ) : <span className="text-sm text-gray-400">—</span>}
                </td>
                <td className="px-5 py-3">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&tipo=${os.tipo}`); }} className="hover:opacity-75 transition text-left" title={`Ver OS do tipo ${os.tipo}`}>
                    <StatusBadge status={os.tipo} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&status=${os.status}`); }} className="hover:opacity-75 transition text-left" title={`Ver OS com status ${os.status}`}>
                    <StatusBadge status={os.status} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?view=lista&prioridade=${os.prioridade}`); }} className="hover:opacity-75 transition text-left" title={`Ver OS com prioridade ${os.prioridade}`}>
                    <StatusBadge status={os.prioridade} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {isOSAtrasada(os)
                      ? <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                      : <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                    }
                    <RelDate date={os.dataPrevisao} className={`text-sm ${isOSAtrasada(os) ? 'text-red-600 font-medium' : 'text-gray-500'}`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
