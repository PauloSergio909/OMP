import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated } from '../../utils/response';
import { ChecklistsService } from './checklists.service';

const service = new ChecklistsService();

const itemSchema = z.object({
  item: z.string().trim().min(2).max(200),
  ok: z.boolean(),
  observacoes: z.string().trim().max(500).optional(),
});

const createChecklistSchema = z.object({
  caminhaoId: z.string().uuid(),
  motoristaId: z.string().uuid(),
  kmAtual: z.number().int().nonnegative(),
  tipo: z.enum(['pre_viagem', 'pos_viagem']).default('pre_viagem'),
  observacoes: z.string().trim().max(2000).optional(),
  itens: z.array(itemSchema).optional().default([]),
});

export async function checklistsRoutes(app: FastifyInstance) {
  app.get('/itens-padrao', { preHandler: [authGuard] }, async (_request, reply) => {
    return sendSuccess(reply, service.itensPadrao());
  });

  app.get('/caminhao/:caminhaoId', { preHandler: [authGuard] }, async (request, reply) => {
    const { caminhaoId } = request.params as { caminhaoId: string };
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(10) }).parse(request.query);
    const checklists = await service.listarPorCaminhao(caminhaoId, limit);
    return sendSuccess(reply, checklists);
  });

  app.get('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const checklist = await service.buscar(id);
    return sendSuccess(reply, checklist);
  });

  app.post('/', { preHandler: [authGuard] }, async (request, reply) => {
    const data = createChecklistSchema.parse(request.body);
    const checklist = await service.criar(data);
    return sendCreated(reply, checklist, 'Checklist registrado');
  });
}
