import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import {
  paginationSchema,
  createEquipamentoSchema,
  updateEquipamentoSchema,
  createMovimentacaoEquipamentoSchema,
} from '@fleetmaster/shared';
import { EquipamentosService } from './equipamentos.service';
import { EquipamentosAnalyticsService } from './equipamentos-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache } from '../../utils/cache';

const service = new EquipamentosService();
const analytics = new EquipamentosAnalyticsService();

export async function equipamentosRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { tipo, status, revisao } = z.object({ tipo: z.string().optional(), status: z.string().optional(), revisao: z.string().optional() }).parse(request.query);

    const result = await service.listar({ ...params, tipo, status, revisoesVencendo: revisao === '1' });
    return sendPaginated(reply, result.equipamentos, result.total, params.page, params.perPage);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('equipamentos:kpis', 300, () => analytics.getKPIs());
    return sendSuccess(reply, kpis);
  });

  app.get('/revisoes-vencendo', { preHandler: [authGuard] }, async (_request, reply) => {
    const dados = await withCache('equipamentos:revisoes-vencendo', 300, () => analytics.revisoesVencendo());
    return sendSuccess(reply, dados);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const equipamento = await service.buscar(id);
    return sendSuccess(reply, equipamento);
  });

  app.post('/', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'criar', entidade: 'Equipamento' })],
  }, async (request, reply) => {
    const data = createEquipamentoSchema.parse(request.body);
    const equipamento = await service.criar(data);
    await invalidateCache('equipamentos:kpis');
    return sendCreated(reply, equipamento);
  });

  app.put('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'editar', entidade: 'Equipamento', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateEquipamentoSchema.parse(request.body);
    const equipamento = await service.atualizar(id, data);
    await invalidateCache('equipamentos:kpis');
    return sendSuccess(reply, equipamento, 'Equipamento atualizado');
  });

  app.post('/:id/movimentacoes', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'mecanico', 'almoxarife']), auditar({ acao: 'movimentacao', entidade: 'Equipamento', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = createMovimentacaoEquipamentoSchema.parse(request.body);
    const mov = await service.registrarMovimentacao(id, data);
    // status do equipamento pode ter mudado (descartado → ativo=false afeta KPIs)
    await Promise.all([
      invalidateCache('equipamentos:kpis'),
      invalidateCache('equipamentos:revisoes-vencendo'),
    ]);
    return sendCreated(reply, mov, 'Movimentação registrada');
  });
}
