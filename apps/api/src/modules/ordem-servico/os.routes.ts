import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import {
  paginationSchema,
  createOrdemServicoSchema,
  updateOSStatusSchema,
  updateOrdemServicoSchema,
  addOSItemSchema,
} from '@fleetmaster/shared';
import { OrdemServicoService } from './os.service';
import { OsAnalyticsService } from './os-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache, invalidateCachePattern } from '../../utils/cache';

const service = new OrdemServicoService();
const analytics = new OsAnalyticsService();

async function invalidateOsBaseCaches() {
  await Promise.all([
    invalidateCache('os:kpis'),
    invalidateCache('os:por-status'),
    invalidateCache('os:por-mecanico'),
  ]);
}

export async function ordemServicoRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { status, tipo, caminhaoId, responsavelId, dataDe, dataAte, prioridade, atrasada } = z.object({
      status: z.string().optional(),
      tipo: z.string().optional(),
      caminhaoId: z.string().optional(),
      responsavelId: z.string().optional(),
      dataDe: z.string().optional(),
      dataAte: z.string().optional(),
      prioridade: z.string().optional(),
      atrasada: z.string().optional(),
    }).parse(request.query);

    const result = await service.listar({ ...params, status, tipo, caminhaoId, responsavelId, dataDe, dataAte, prioridade, atrasadas: atrasada === '1' });
    return sendPaginated(reply, result.ordens, result.total, params.page, params.perPage);
  });

  app.get('/por-status', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('os:por-status', 120, () => analytics.porStatus());
    return sendSuccess(reply, dados);
  });

  app.get('/tempo-medio-resolucao', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('os:tempo-medio-resolucao', 300, () => analytics.tempoMedioResolucao());
    return sendSuccess(reply, dados);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('os:kpis', 300, () => analytics.getKPIs());
    return sendSuccess(reply, kpis);
  });

  app.get('/custo-por-caminhao', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('os:custo-por-caminhao', 300, () => analytics.custoPorCaminhao());
    return sendSuccess(reply, dados);
  });

  app.get('/por-mecanico', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('os:por-mecanico', 300, () => analytics.osPorMecanico());
    return sendSuccess(reply, dados);
  });

  app.get('/tendencia-mensal', { preHandler: [authGuard] }, async (request, reply) => {
    const { meses } = z.object({ meses: z.coerce.number().int().min(1).max(24).default(6) }).parse(request.query);
    const dados = await analytics.tendenciaMensal(meses);
    return sendSuccess(reply, dados);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const os = await service.buscar(id);
    return sendSuccess(reply, os);
  });

  app.post('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'criar', entidade: 'OrdemServico' })],
  }, async (request, reply) => {
    const data = createOrdemServicoSchema.parse(request.body);
    const usuario = request.user as { id: string; nome: string };
    const os = await service.criar({ ...data, usuario });
    await invalidateOsBaseCaches();
    return sendCreated(reply, os);
  });

  app.post('/:id/duplicar', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'duplicar', entidade: 'OrdemServico', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const usuario = request.user as { id: string; nome: string };
    const os = await service.duplicar(id, usuario);
    await invalidateOsBaseCaches();
    return sendCreated(reply, os, `OS duplicada com sucesso`);
  });

  app.patch('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'editar', entidade: 'OrdemServico', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateOrdemServicoSchema.parse(request.body);
    const os = await service.atualizar(id, data);
    // responsavelId ou prioridade pode ter mudado → afeta por-mecanico
    if (data.responsavelId) {
      await invalidateCache('os:por-mecanico');
    }
    return sendSuccess(reply, os, 'OS atualizada');
  });

  app.patch('/:id/status', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'mudar_status', entidade: 'OrdemServico', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, observacoes } = updateOSStatusSchema.parse(request.body);
    const usuario = request.user as { id: string; nome: string };
    const os = await service.atualizarStatus(id, status, observacoes, usuario);
    await Promise.all([
      invalidateOsBaseCaches(),
      invalidateCache('os:custo-por-caminhao'),
      invalidateCache('os:tempo-medio-resolucao'),
      invalidateCache('frota:custo-por-km'),
      invalidateCache('frota:ranking-custo'),
      // A1+A6: OS preventiva concluída atualiza proximaManutencao e proximaManutencaoKm
      invalidateCache('frota:manutencao-vencendo'),
      invalidateCachePattern('frota:proximos-manutencao-km:*'),
    ]);
    return sendSuccess(reply, os, `OS atualizada para ${status}`);
  });

  app.post('/:id/itens', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico', 'almoxarife']), auditar({ acao: 'adicionar_item', entidade: 'OrdemServico', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = addOSItemSchema.parse(request.body);
    const novoItem = await service.adicionarItem(id, item);
    return sendCreated(reply, novoItem, 'Item adicionado à OS');
  });

  app.delete('/:id/itens/:itemId', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico']), auditar({ acao: 'remover_item', entidade: 'OrdemServico', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { itemId } = request.params as { id: string; itemId: string };
    await service.removerItem(itemId);
    return sendSuccess(reply, null, 'Item removido');
  });

}
