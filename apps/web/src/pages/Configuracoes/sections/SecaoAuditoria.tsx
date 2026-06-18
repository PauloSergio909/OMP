import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { relativeDate } from '../../../utils/formatDate';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { CopyText } from '../../../components/ui/CopyText';
import { useLogsAuditoria } from '../../../hooks/useApi';

const entidades = [
  'OrdemServico', 'OrdemCompra', 'ConfiguracaoEmpresa', 'Caminhao',
  'Material', 'Categoria', 'Fornecedor', 'Funcionario',
  'Equipamento', 'Abastecimento', 'Usuario',
];

const entidadeLabel: Record<string, string> = {
  OrdemServico: 'Ordem de Serviço',
  OrdemCompra: 'Ordem de Compra',
  ConfiguracaoEmpresa: 'Empresa',
  Caminhao: 'Caminhão',
  Material: 'Material',
  Categoria: 'Categoria',
  Fornecedor: 'Fornecedor',
  Funcionario: 'Funcionário',
  Equipamento: 'Equipamento',
  Abastecimento: 'Abastecimento',
  Usuario: 'Usuário',
};

const acaoLabel: Record<string, string> = {
  criar: 'Criação',
  editar: 'Edição',
  mudar_status: 'Mudança de status',
  desativar: 'Desativação',
  entrada_estoque: 'Entrada em estoque',
  saida_estoque: 'Saída de estoque',
  movimentacao: 'Movimentação',
  remover: 'Remoção',
  remover_item: 'Remoção de item',
  adicionar_item: 'Adição de item',
  registrar_km: 'Registro de KM',
  editar_perfil: 'Edição de perfil',
  alterar_senha: 'Alteração de senha',
};

const entityRoutes: Record<string, string> = {
  OrdemServico: '/ordens-servico',
  OrdemCompra: '/compras',
  Caminhao: '/frota',
  Funcionario: '/funcionarios',
  Material: '/estoque',
  Equipamento: '/equipamentos',
};

export function SecaoAuditoria() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filtroEntidade, setFiltroEntidade] = useState('');

  const { data: auditData, isLoading } = useLogsAuditoria(page, undefined, filtroEntidade || undefined);
  const logs = auditData?.data ?? [];
  const pagination = auditData?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Log de Auditoria</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ações realizadas pelos usuários no sistema</p>
        </div>
        <select
          value={filtroEntidade}
          onChange={(e) => { setFiltroEntidade(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Todas as entidades</option>
          {entidades.map((e) => <option key={e} value={e}>{entidadeLabel[e] ?? e}</option>)}
        </select>
      </div>

      <div className="border border-gray-100 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'ID', 'IP'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableSkeleton rows={4} cols={6} />
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <ClipboardList size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Nenhum registro de auditoria encontrado</p>
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {(() => {
                    const r = relativeDate(log.createdAt);
                    const time = new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    return <span title={`${r.title} ${time}`}>{r.label} {time}</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.userNome}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {acaoLabel[log.acao] ?? log.acao}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.entidadeId && entityRoutes[log.entidade] ? (
                    <button
                      onClick={() => navigate(`${entityRoutes[log.entidade]}/${log.entidadeId}`)}
                      className="hover:text-blue-600 transition text-left"
                      title={`Ver ${entidadeLabel[log.entidade] ?? log.entidade}`}
                    >
                      {entidadeLabel[log.entidade] ?? log.entidade}
                    </button>
                  ) : (entidadeLabel[log.entidade] ?? log.entidade)}
                </td>
                <td className="px-4 py-3">
                  {log.entidadeId ? <CopyText text={log.entidadeId} className="text-xs font-mono text-gray-400" /> : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{log.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs text-gray-400">{pagination.total} registros</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Anterior</button>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
