import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

type AuditOptions = {
  acao: string;
  entidade: string;
  getEntidadeId?: (req: FastifyRequest) => string | undefined;
};

export function auditar(opts: AuditOptions) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = request.user as { id: string; nome: string } | undefined;
    if (!user) return;

    const entidadeId = opts.getEntidadeId?.(request);
    const ip = request.ip;

    setImmediate(async () => {
      try {
        await prisma.logAuditoria.create({
          data: {
            userId: user.id,
            userNome: user.nome,
            acao: opts.acao,
            entidade: opts.entidade,
            entidadeId: entidadeId ?? null,
            ip,
          },
        });
      } catch (err) {
        logger.error('Falha ao registrar log de auditoria', { err });
      }
    });
  };
}
