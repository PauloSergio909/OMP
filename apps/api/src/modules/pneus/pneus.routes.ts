import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated } from '../../utils/response';
import { PneusService } from './pneus.service';
import { PneusAnalyticsService } from './pneus-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache } from '../../utils/cache';

const service = new PneusService();
const analytics = new PneusAnalyticsService();

async function invalidatePneusCaches() {
  await Promise.all([
    invalidateCache('pneus:kpis'),
    invalidateCache('pneus:alertas'),
  ]);
}

const createPneuSchema = z.object({
  caminhaoId: z.string().uuid(),
  posicao: z.enum(['dianteiro_esq', 'dianteiro_dir', 'traseiro_esq_ext', 'traseiro_esq_int', 'traseiro_dir_int', 'traseiro_dir_ext', 'estepe']),
  marca: z.string().trim().min(2).max(100),
  modelo: z.string().trim().min(2).max(100),
  numeroSerie: z.string().trim().max(100).optional(),
  kmInstalacao: z.number().int().nonnegative(),
  kmVidaUtil: z.number().int().positive().max(500_000).optional(),
});

const registrarTrocaSchema = z.object({
  kmTroca: z.number().int().positive(),
  motivo: z.string().trim().min(3).max(500),
  custo: z.number().nonnegative().optional(),
  observacoes: z.string().trim().max(1000).optional(),
  novoPneu: z.object({
    posicao: z.enum(['dianteiro_esq', 'dianteiro_dir', 'traseiro_esq_ext', 'traseiro_esq_int', 'traseiro_dir_int', 'traseiro_dir_ext', 'estepe']),
    marca: z.string().trim().min(2).max(100),
    modelo: z.string().trim().min(2).max(100),
    numeroSerie: z.string().trim().max(100).optional(),
    kmInstalacao: z.number().int().nonnegative(),
    kmVidaUtil: z.number().int().positive().max(500_000).optional(),
  }).optional(),
});

export async function pneusRoutes(app: FastifyInstance) {
  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('pneus:kpis', 300, () => analytics.getKPIsGlobal());
    return sendSuccess(reply, kpis);
  });

  app.get('/alertas', { preHandler: [authGuard] }, async (_request, reply) => {
    const alertas = await withCache('pneus:alertas', 300, () => analytics.listarAlertas());
    return sendSuccess(reply, alertas);
  });

  app.get('/caminhao/:caminhaoId', { preHandler: [authGuard] }, async (request, reply) => {
    const { caminhaoId } = request.params as { caminhaoId: string };
    const pneus = await service.listarPorCaminhao(caminhaoId);
    return sendSuccess(reply, pneus);
  });

  app.get('/caminhao/:caminhaoId/kpis', { preHandler: [authGuard] }, async (request, reply) => {
    const { caminhaoId } = request.params as { caminhaoId: string };
    const { kmAtual } = z.object({ kmAtual: z.coerce.number().int().nonnegative() }).parse(request.query);
    const kpis = await analytics.getKPIs(caminhaoId, kmAtual);
    return sendSuccess(reply, kpis);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pneu = await service.buscar(id);
    return sendSuccess(reply, pneu);
  });

  app.post('/', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'criar', entidade: 'Pneu' })],
  }, async (request, reply) => {
    const data = createPneuSchema.parse(request.body);
    const pneu = await service.criar(data);
    await invalidatePneusCaches();
    return sendCreated(reply, pneu, 'Pneu cadastrado com sucesso');
  });

  app.post('/:id/troca', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'troca_pneu', entidade: 'Pneu', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = registrarTrocaSchema.parse(request.body);
    const result = await service.registrarTroca(id, data);
    await invalidatePneusCaches();
    return sendSuccess(reply, result, 'Troca de pneu registrada');
  });
}
