import { FastifyInstance } from 'fastify';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { z } from 'zod';
import { paginationSchema, createOrdemCompraSchema, updateOrdemCompraStatusSchema, updateOrdemCompraSchema } from '@fleetmaster/shared';
import { ComprasService } from './compras.service';
import { ComprasAnalyticsService } from './compras-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache } from '../../utils/cache';

const service = new ComprasService();
const analytics = new ComprasAnalyticsService();

export async function comprasRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { status, search, de, ate, atrasada } = z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      de: z.string().optional(),
      ate: z.string().optional(),
      atrasada: z.string().optional(),
    }).parse(request.query);
    const result = await service.listar({ ...params, status, search, dataDe: de, dataAte: ate, atrasada: atrasada === '1' });
    return sendPaginated(reply, result.compras, result.total, params.page, params.perPage);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('compras:kpis', 300, () => analytics.getKPIs());
    return sendSuccess(reply, kpis);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const compra = await service.buscar(id);
    return sendSuccess(reply, compra);
  });

  app.post('/', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'criar', entidade: 'OrdemCompra' })],
  }, async (request, reply) => {
    const data = createOrdemCompraSchema.parse(request.body);
    const compra = await service.criar(data);
    await invalidateCache('compras:kpis');
    return sendCreated(reply, compra, 'Ordem de compra criada');
  });

  app.put('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'OrdemCompra', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateOrdemCompraSchema.parse(request.body);
    const compra = await service.atualizar(id, data);
    return sendSuccess(reply, compra, 'OC atualizada');
  });

  app.patch('/:id/status', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'mudar_status', entidade: 'OrdemCompra', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = updateOrdemCompraStatusSchema.parse(request.body);
    const user = request.user as { id: string };
    const compra = await service.atualizarStatus(id, status, user.id);
    await invalidateCache('compras:kpis');
    return sendSuccess(reply, compra, `OC atualizada para ${status}`);
  });

  app.post('/:id/itens', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'adicionar_item', entidade: 'OrdemCompra', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = z.object({
      materialId:    z.string().uuid(),
      quantidade:    z.number().int().positive(),
      precoUnitario: z.number().positive(),
    }).parse(request.body);
    const novoItem = await service.adicionarItem(id, item);
    return sendCreated(reply, novoItem, 'Item adicionado à OC');
  });

  app.delete('/:id/itens/:itemId', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'remover_item', entidade: 'OrdemCompra', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { itemId } = request.params as { id: string; itemId: string };
    await service.removerItem(itemId);
    return sendSuccess(reply, null, 'Item removido');
  });
}
