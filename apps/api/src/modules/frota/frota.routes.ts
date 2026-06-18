import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import {
  paginationSchema,
  createCaminhaoSchema,
  updateCaminhaoSchema,
  updateCaminhaoStatusSchema,
  registrarKmSchema,
} from '@fleetmaster/shared';
import { FrotaService } from './frota.service';
import { FrotaAnalyticsService } from './frota-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache, invalidateCachePattern } from '../../utils/cache';

const service = new FrotaService();
const analytics = new FrotaAnalyticsService();

export async function frotaRoutes(app: FastifyInstance) {
  app.get('/caminhoes', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { status, manutencao } = z.object({ status: z.string().optional(), manutencao: z.string().optional() }).parse(request.query);

    const result = await service.listarCaminhoes({ ...params, status, manutencaoVencida: manutencao === '1' });
    return sendPaginated(reply, result.caminhoes, result.total, params.page, params.perPage);
  });

  app.get('/caminhoes/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const caminhao = await service.buscarCaminhao(id);
    return sendSuccess(reply, caminhao);
  });

  app.post('/caminhoes', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'criar', entidade: 'Caminhao' })],
  }, async (request, reply) => {
    const data = createCaminhaoSchema.parse(request.body);
    const caminhao = await service.criarCaminhao(data);
    await Promise.all([
      invalidateCache('frota:kpis'),
      invalidateCachePattern('frota:proximos-manutencao-km:*'),
    ]);
    return sendCreated(reply, caminhao);
  });

  app.put('/caminhoes/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'Caminhao', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateCaminhaoSchema.parse(request.body);
    const caminhao = await service.atualizarCaminhao(id, data);
    await Promise.all([
      invalidateCache('frota:kpis'),
      invalidateCache('frota:manutencao-vencendo'),
      // proximaManutencaoKm pode ter mudado → recalcula caminhões próximos do limiar
      invalidateCachePattern('frota:proximos-manutencao-km:*'),
    ]);
    return sendSuccess(reply, caminhao, 'Caminhão atualizado');
  });

  app.patch('/caminhoes/:id/status', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'mudar_status', entidade: 'Caminhao', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = updateCaminhaoStatusSchema.parse(request.body);
    const caminhao = await service.atualizarStatus(id, status);
    await Promise.all([
      invalidateCache('frota:kpis'),
      // status 'operacional' ↔ 'manutencao' afeta lista de manutenção vencendo
      invalidateCache('frota:manutencao-vencendo'),
    ]);
    return sendSuccess(reply, caminhao, 'Status atualizado');
  });

  app.post('/caminhoes/:id/km', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'registrar_km', entidade: 'Caminhao', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { km } = registrarKmSchema.parse(request.body);
    const registro = await service.registrarKm(id, km);
    await Promise.all([
      invalidateCache('frota:custo-por-km'),
      invalidateCache('pneus:kpis'),
      invalidateCache('pneus:alertas'),
      invalidateCache(`abastecimento:eficiencia:${id}`),
      // km muda a proximidade ao limiar → invalida todos os limites em cache
      invalidateCachePattern('frota:proximos-manutencao-km:*'),
    ]);
    return sendCreated(reply, registro, 'KM registrado');
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('frota:kpis', 300, () => analytics.getKPIs());
    return sendSuccess(reply, kpis);
  });

  app.get('/manutencao-vencendo', { preHandler: [authGuard] }, async (_request, reply) => {
    const lista = await withCache('frota:manutencao-vencendo', 300, () => analytics.caminhoesComManutencaoVencendo());
    return sendSuccess(reply, lista);
  });

  app.get('/proximos-manutencao-km', { preHandler: [authGuard] }, async (request, reply) => {
    const { margem } = z.object({ margem: z.coerce.number().int().positive().max(50_000).default(1000) }).parse(request.query);
    const lista = await withCache(`frota:proximos-manutencao-km:${margem}`, 300, () => analytics.caminhoesProximosManutencaoKm(margem));
    return sendSuccess(reply, lista);
  });

  app.get('/documentos-vencendo', { preHandler: [authGuard] }, async (_request, reply) => {
    const lista = await withCache('frota:documentos-vencendo', 300, () => analytics.documentosVencendo());
    return sendSuccess(reply, lista);
  });

  app.get('/custo-por-km', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('frota:custo-por-km', 300, () => analytics.custoPorKm());
    return sendSuccess(reply, dados);
  });

  app.get('/caminhoes/:id/timeline', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(request.query);
    const timeline = await analytics.timelineManutencao(id, limit);
    return sendSuccess(reply, timeline);
  });

  app.get('/ranking-custo', { preHandler: [authGuard] }, async (request, reply) => {
    const { top } = z.object({ top: z.coerce.number().int().min(1).max(100).default(10) }).parse(request.query);
    const dados = await withCache('frota:ranking-custo', 300, () => analytics.rankingCusto(top));
    return sendSuccess(reply, dados);
  });
  
  app.get('/caminhoes/:id/historico-km', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const historico = await analytics.historicoKm(id);
    return sendSuccess(reply, historico);
  });
}

