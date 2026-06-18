import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AgendaService } from './agenda.service';

const service = new AgendaService();

const criarEventoSchema = z.object({
  titulo:    z.string().trim().min(2).max(200),
  descricao: z.string().trim().max(500).optional(),
  data:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  tipo:      z.enum(['lembrete', 'reuniao', 'vistoria', 'outro']).optional(),
  cor:       z.enum(['blue', 'green', 'orange', 'red', 'purple', 'gray']).optional(),
  link:      z.string().url().optional().or(z.literal('')),
});

const atualizarEventoSchema = criarEventoSchema.partial().extend({
  descricao: z.string().trim().max(500).optional().nullable(),
  link:      z.string().url().optional().nullable().or(z.literal('')),
});

export async function agendaRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const { mes } = z.object({
      mes: z.string().regex(/^\d{4}-\d{2}$/, 'Use formato YYYY-MM').optional(),
    }).parse(request.query);

    const result = await service.listarEventos(mes);
    return sendSuccess(reply, result);
  });

  app.post('/', { preHandler: [authGuard] }, async (request, reply) => {
    const data = criarEventoSchema.parse(request.body);
    const user = request.user as { id: string };
    const evento = await service.criarEvento(data, user.id);
    return sendCreated(reply, evento, 'Evento criado');
  });

  app.put('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = atualizarEventoSchema.parse(request.body);
    const user = request.user as { id: string };
    const evento = await service.atualizarEvento(id, data, user.id);
    return sendSuccess(reply, evento, 'Evento atualizado');
  });

  app.delete('/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: string };
    await service.removerEvento(id, user.id);
    return sendSuccess(reply, null, 'Evento removido');
  });
}
