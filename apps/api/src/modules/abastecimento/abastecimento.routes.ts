import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { paginationSchema, createAbastecimentoSchema, updateAbastecimentoSchema } from '@fleetmaster/shared';
import { AbastecimentoService } from './abastecimento.service';
import { AbastecimentoAnalyticsService } from './abastecimento-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache, invalidateCachePattern } from '../../utils/cache';

const service = new AbastecimentoService();
const analytics = new AbastecimentoAnalyticsService();

async function invalidateAbastecimentoCaches() {
  await Promise.all([
    invalidateCachePattern('abastecimento:kpis*'),
    invalidateCachePattern('abastecimento:historico:*'),
    invalidateCachePattern('abastecimento:eficiencia:*'),
    invalidateCache('abastecimento:ranking-eficiencia'),
    invalidateCache('abastecimento:consumo-por-caminhao'),
    invalidateCache('frota:custo-por-km'),
    invalidateCache('frota:ranking-custo'),
  ]);
}

export async function abastecimentoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { caminhaoId, motoristaId, dataDe, dataAte, search, combustivel } = z.object({
      caminhaoId: z.string().optional(),
      motoristaId: z.string().optional(),
      dataDe: z.string().optional(),
      dataAte: z.string().optional(),
      search: z.string().optional(),
      combustivel: z.string().optional(),
    }).parse(request.query);

    const result = await service.listar({ ...params, caminhaoId, motoristaId, dataDe, dataAte, search, combustivel });
    return sendPaginated(reply, result.abastecimentos, result.total, params.page, params.perPage);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (request, reply) => {
    const { caminhaoId } = z.object({ caminhaoId: z.string().optional() }).parse(request.query);
    const cacheKey = caminhaoId ? `abastecimento:kpis:${caminhaoId}` : 'abastecimento:kpis';
    const kpis = await withCache(cacheKey, 300, () => analytics.getKPIs(caminhaoId));
    return sendSuccess(reply, kpis);
  });

  app.get('/historico-mensal', { preHandler: [authGuard] }, async (request, reply) => {
    const { meses, caminhaoId } = z.object({
      meses: z.coerce.number().int().min(1).max(24).default(6),
      caminhaoId: z.string().uuid().optional(),
    }).parse(request.query);
    const cacheKey = caminhaoId ? `abastecimento:historico:${meses}:${caminhaoId}` : `abastecimento:historico:${meses}`;
    const historico = await withCache(cacheKey, 300, () => analytics.historicoMensal(meses, caminhaoId));
    return sendSuccess(reply, historico);
  });

  app.get('/consumo-por-caminhao', { preHandler: [authGuard] }, async (_request, reply) => {
    const consumo = await withCache('abastecimento:consumo-por-caminhao', 300, () => analytics.consumoPorCaminhao());
    return sendSuccess(reply, consumo);
  });

  app.get('/ranking-eficiencia', { preHandler: [authGuard] }, async (_request, reply) => {
    const ranking = await withCache('abastecimento:ranking-eficiencia', 300, () => analytics.rankingEficiencia());
    return sendSuccess(reply, ranking);
  });

  app.get('/eficiencia/:caminhaoId', { preHandler: [authGuard] }, async (request, reply) => {
    const { caminhaoId } = request.params as { caminhaoId: string };
    const eficiencia = await withCache(`abastecimento:eficiencia:${caminhaoId}`, 300, () => analytics.getEficienciaCaminhao(caminhaoId));
    return sendSuccess(reply, eficiencia);
  });

  app.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico', 'almoxarife']), auditar({ acao: 'criar', entidade: 'Abastecimento' })],
  }, async (request, reply) => {
    const data = createAbastecimentoSchema.parse(request.body);
    const abastecimento = await service.registrar(data);
    await invalidateAbastecimentoCaches();
    return sendCreated(reply, abastecimento, 'Abastecimento registrado');
  });

  app.put('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'Abastecimento', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateAbastecimentoSchema.parse(request.body);
    const ab = await service.atualizar(id, data);
    await invalidateAbastecimentoCaches();
    return sendSuccess(reply, ab, 'Abastecimento atualizado');
  });

  app.delete('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'remover', entidade: 'Abastecimento', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.remover(id);
    await invalidateAbastecimentoCaches();
    return sendSuccess(reply, null, 'Abastecimento removido');
  });
}

