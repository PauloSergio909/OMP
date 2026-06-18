import { FastifyReply } from 'fastify';

export function sendSuccess<T>(reply: FastifyReply, data: T, message = 'Sucesso', statusCode = 200) {
  return reply.status(statusCode).send({ data, message });
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  perPage: number,
  message = 'Sucesso',
) {
  return reply.status(200).send({
    data,
    message,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
}

export function sendError(reply: FastifyReply, message: string, statusCode = 400, details?: unknown) {
  return reply.status(statusCode).send({ error: message, ...(details !== undefined && { details }) });
}

export function sendCreated<T>(reply: FastifyReply, data: T, message = 'Criado com sucesso') {
  return sendSuccess(reply, data, message, 201);
}
