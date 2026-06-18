import { FastifyRequest, FastifyReply } from 'fastify';
import { sendError } from '../utils/response';
import { redis } from '../config/redis';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id?: string; type?: string; iat?: number };

    if (payload.type === 'refresh') {
      return sendError(reply, 'Token inválido ou expirado. Faça login novamente.', 401);
    }

    if (redis && payload.id && payload.iat) {
      const bloqueado = await redis.get(`blocklist:${payload.id}:${payload.iat}`);
      if (bloqueado) {
        return sendError(reply, 'Token inválido ou expirado. Faça login novamente.', 401);
      }
    }
  } catch (error) {
    return sendError(reply, 'Token inválido ou expirado. Faça login novamente.', 401);
  }
}

export function roleGuard(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; role: string } | undefined;

    if (!user || !allowedRoles.includes(user.role)) {
      return sendError(reply, 'Você não tem permissão para acessar este recurso.', 403);
    }
  };
}
