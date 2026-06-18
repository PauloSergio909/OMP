import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  if (error instanceof PrismaClientValidationError) {
    return reply.status(400).send({ error: 'Dados inválidos' });
  }

  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Registro não encontrado' });
    }
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Registro já existe com esses dados' });
    }
  }

  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((e) => ({
      campo: e.path.join('.'),  
      mensagem: e.message,       
    }));

    return reply.status(400).send({
      error: 'Dados inválidos',
      details: formattedErrors,
    });
  }

  if (error.validation) {
    return reply.status(400).send({
      error: 'Dados inválidos',
      details: error.validation,
    });
  }

  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: 'Recurso não encontrado',
    });
  }

  logger.error('Erro não tratado:', {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  return reply.status(500).send({
    error: 'Erro interno do servidor. Tente novamente mais tarde.',
  });
}
