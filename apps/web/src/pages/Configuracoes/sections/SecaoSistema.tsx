import { Database } from 'lucide-react';
import { useAdminStats, useFlushCache } from '../../../hooks/useApi';

export function SecaoSistema() {
  const { data: stats, isLoading } = useAdminStats();
  const flushCache = useFlushCache();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Informações do Sistema</h2>
        <p className="text-xs text-gray-400 mb-5">Métricas e dados técnicos em tempo real.</p>
      </div>

      {/* Infraestrutura */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Infraestrutura</p>
        </div>
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between px-5 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))
          ) : stats ? (
            [
              { label: 'Node.js', value: stats.infraestrutura.nodeVersion },
              { label: 'Uptime', value: `${Math.floor(stats.infraestrutura.uptimeSegundos / 3600)}h ${Math.floor((stats.infraestrutura.uptimeSegundos % 3600) / 60)}min` },
              { label: 'Memória Heap', value: `${stats.infraestrutura.memoriaHeapMB} MB` },
              { label: 'Banco de Dados', value: stats.infraestrutura.dbTamanho },
              { label: 'Redis', value: stats.infraestrutura.redisMemoria },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-mono font-medium text-gray-800">{item.value}</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-4 text-sm text-red-500">Sem permissão ou erro ao carregar stats.</div>
          )}
        </div>
      </div>

      {/* Manutenção */}
      {stats?.infraestrutura.redisAtivo && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Manutenção</h3>
          <p className="text-xs text-gray-400 mb-4">Ações administrativas para limpeza e diagnóstico.</p>
          <button
            onClick={() => flushCache.mutate()}
            disabled={flushCache.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition disabled:opacity-50"
          >
            <Database size={14} />
            {flushCache.isPending ? 'Limpando cache…' : 'Limpar cache Redis'}
          </button>
          <p className="text-xs text-gray-400 mt-2">Remove todos os dados de cache. As próximas consultas aos KPIs serão recalculadas no banco.</p>
        </div>
      )}

      {/* Totais de Registros */}
      {stats && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Totais de Registros</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-50">
            {[
              { label: 'Usuários', value: stats.registros.usuarios },
              { label: 'Funcionários', value: stats.registros.funcionarios },
              { label: 'Caminhões', value: stats.registros.caminhoes },
              { label: 'Ordens de Serviço', value: stats.registros.ordensServico },
              { label: 'Materiais', value: stats.registros.materiais },
              { label: 'Equipamentos', value: stats.registros.equipamentos },
              { label: 'Abastecimentos', value: stats.registros.abastecimentos },
              { label: 'Ordens de Compra', value: stats.registros.ordensCompra },
              { label: 'Pneus Ativos', value: stats.registros.pneus },
              { label: 'Logs Auditoria', value: stats.registros.logsAuditoria },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
