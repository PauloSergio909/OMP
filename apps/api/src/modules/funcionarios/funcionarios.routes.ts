import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { paginationSchema, createFuncionarioSchema, updateFuncionarioSchema, updateFuncionarioStatusSchema } from '@fleetmaster/shared';
import { FuncionariosService } from './funcionarios.service';
import { FuncionariosAnalyticsService } from './funcionarios-analytics.service';
import { auditar } from '../../middleware/auditoria.middleware';

const service = new FuncionariosService();
const analytics = new FuncionariosAnalyticsService();

export async function funcionariosRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { cargo, ativo, cnh } = z.object({ cargo: z.string().optional(), ativo: z.string().optional(), cnh: z.string().optional() }).parse(request.query);

    const result = await service.listar({
      ...params,
      cargo,
      ativo: ativo !== undefined ? ativo === 'true' : undefined,
      cnhAlerta: cnh === '1',
    });

    return sendPaginated(reply, result.funcionarios, result.total, params.page, params.perPage);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await analytics.getKPIs();
    return sendSuccess(reply, kpis);
  });

  app.get('/motoristas-disponiveis', { preHandler: [authGuard] }, async (_request, reply) => {
    const motoristas = await analytics.motoristasDisponiveis();
    return sendSuccess(reply, motoristas);
  });

  app.get('/cnh-vencendo', { preHandler: [authGuard] }, async (_request, reply) => {
    const lista = await analytics.cnhVencendo();
    return sendSuccess(reply, lista);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const funcionario = await service.buscar(id);
    return sendSuccess(reply, funcionario);
  });

  app.post('/', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'criar', entidade: 'Funcionario' })],
  }, async (request, reply) => {
    const data = createFuncionarioSchema.parse(request.body);
    const funcionario = await service.criar(data);
    return sendCreated(reply, funcionario);
  });

  app.put('/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'Funcionario', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateFuncionarioSchema.parse(request.body);
    const funcionario = await service.atualizar(id, data);
    return sendSuccess(reply, funcionario, 'Funcionário atualizado');
  });
  
  app.patch('/:id/status', {
    preHandler: [authGuard, roleGuard(['admin']), auditar({ acao: 'mudar_status', entidade: 'Funcionario', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ativo } = updateFuncionarioStatusSchema.parse(request.body);
    const funcionario = await service.atualizar(id, { ativo });
    return sendSuccess(reply, funcionario, ativo ? 'Funcionário reativado' : 'Funcionário desativado');
  });
  
}

