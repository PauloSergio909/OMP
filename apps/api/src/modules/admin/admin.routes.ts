import { FastifyInstance } from 'fastify';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { withCache } from '../../utils/cache';
import { logger } from '../../utils/logger';

export async function adminRoutes(app: FastifyInstance) {
  app.get('/stats', { preHandler: [authGuard, roleGuard(['admin'])] }, async (_request, reply) => {
    const stats = await withCache('admin:stats', 60, async () => {
      const [
        usuarios, funcionarios, caminhoes, ordensServico,
        materiais, equipamentos, abastecimentos, ordensCompra,
        logsAuditoria, pneus,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.funcionario.count({ where: { ativo: true } }),
        prisma.caminhao.count(),
        prisma.ordemServico.count(),
        prisma.material.count({ where: { ativo: true } }),
        prisma.equipamento.count({ where: { ativo: true } }),
        prisma.abastecimento.count(),
        prisma.ordemCompra.count(),
        prisma.logAuditoria.count(),
        prisma.pneu.count({ where: { status: 'ativo' } }),
      ]);

      const [redisInfo, dbSize] = await Promise.all([
        redis ? redis.info('memory').catch(() => null) : null,
        prisma.$queryRaw<[{ size: string }]>`
          SELECT pg_size_pretty(pg_database_size(current_database())) AS size
        `.catch(() => [{ size: 'N/A' }]),
      ]);

      const redisUsedMemory = redisInfo
        ? redisInfo.split('\r\n').find((l) => l.startsWith('used_memory_human:'))?.split(':')[1]?.trim() ?? 'N/A'
        : 'disabled';

      return {
        registros: { usuarios, funcionarios, caminhoes, ordensServico, materiais, equipamentos, abastecimentos, ordensCompra, logsAuditoria, pneus },
        infraestrutura: {
          nodeVersion: process.version,
          uptimeSegundos: Math.floor(process.uptime()),
          memoriaHeapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          redisMemoria: redisUsedMemory,
          dbTamanho: (dbSize as [{ size: string }])[0]?.size ?? 'N/A',
          redisAtivo: redis !== null,
        },
      };
    });

    return sendSuccess(reply, stats);
  });

  app.delete('/cache', { preHandler: [authGuard, roleGuard(['admin'])] }, async (request, reply) => {
    if (!redis) {
      return sendSuccess(reply, { removidas: 0, aviso: 'Redis não está disponível' });
    }

    const padroes = ['frota:*', 'os:*', 'estoque:*', 'abastecimento:*', 'equipamentos:*', 'pneus:*', 'compras:*', 'admin:*'];
    let total = 0;
    for (const padrao of padroes) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', padrao, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
          total += keys.length;
        }
      } while (cursor !== '0');
    }

    const user = request.user as { nome: string };
    logger.info(`Cache Redis limpo por ${user.nome} — ${total} chave(s) removida(s)`);
    return sendSuccess(reply, { removidas: total, mensagem: `${total} chave(s) de cache removida(s)` });
  });
}
