import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { updateEmpresaSchema, paginationSchema } from '@fleetmaster/shared';
import { ConfiguracoesService } from './configuracoes.service';
import { auditar } from '../../middleware/auditoria.middleware';

const service = new ConfiguracoesService();

export async function configuracoesRoutes(app: FastifyInstance) {
  app.get('/empresa', { preHandler: [authGuard] }, async (_request, reply) => {
    const empresa = await service.getEmpresa();
    return sendSuccess(reply, empresa);
  });

  app.put('/empresa', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'ConfiguracaoEmpresa' })],
  }, async (request, reply) => {
    const data = updateEmpresaSchema.parse(request.body);
    const empresa = await service.updateEmpresa(data);
    return sendSuccess(reply, empresa, 'Dados da empresa atualizados');
  });

  app.get('/auditoria', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente'])],
  }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { userId, entidade } = z.object({
      userId: z.string().optional(),
      entidade: z.string().optional(),
    }).parse(request.query);

    const result = await service.getLogsAuditoria({ ...params, userId, entidade });
    return sendPaginated(reply, result.logs, result.total, params.page, params.perPage);
  });
}
