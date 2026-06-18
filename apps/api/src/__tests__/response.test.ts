import { sendSuccess, sendPaginated, sendError, sendCreated } from '../utils/response';

function makeReply() {
  const calls: { status: number; body: unknown }[] = [];
  const reply = {
    status(code: number) {
      return {
        send(body: unknown) {
          calls.push({ status: code, body });
          return body;
        },
      };
    },
    _calls: calls,
  };
  return reply as unknown as import('fastify').FastifyReply & { _calls: typeof calls };
}

describe('sendSuccess', () => {
  it('retorna status 200 e envelope correto', () => {
    const reply = makeReply();
    sendSuccess(reply, { id: '1' });
    expect(reply._calls[0].status).toBe(200);
    expect((reply._calls[0].body as Record<string, unknown>).data).toEqual({ id: '1' });
    expect((reply._calls[0].body as Record<string, unknown>).message).toBe('Sucesso');
  });

  it('aceita statusCode customizado', () => {
    const reply = makeReply();
    sendSuccess(reply, null, 'ok', 202);
    expect(reply._calls[0].status).toBe(202);
  });
});

describe('sendCreated', () => {
  it('retorna status 201', () => {
    const reply = makeReply();
    sendCreated(reply, { id: '2' });
    expect(reply._calls[0].status).toBe(201);
  });
});

describe('sendError', () => {
  it('retorna status 400 e campo error', () => {
    const reply = makeReply();
    sendError(reply, 'Erro de teste');
    expect(reply._calls[0].status).toBe(400);
    expect((reply._calls[0].body as Record<string, unknown>).error).toBe('Erro de teste');
  });

  it('inclui details quando fornecido', () => {
    const reply = makeReply();
    sendError(reply, 'Inválido', 422, [{ mensagem: 'campo obrigatório' }]);
    const body = reply._calls[0].body as Record<string, unknown>;
    expect(body.details).toBeDefined();
  });
});

describe('sendPaginated', () => {
  it('calcula totalPages corretamente', () => {
    const reply = makeReply();
    sendPaginated(reply, [1, 2, 3], 25, 2, 10);
    const body = reply._calls[0].body as Record<string, { totalPages: number; page: number }>;
    expect(body.pagination.totalPages).toBe(3);
    expect(body.pagination.page).toBe(2);
  });

  it('totalPages é 0 quando total = 0', () => {
    const reply = makeReply();
    sendPaginated(reply, [], 0, 1, 10);
    const body = reply._calls[0].body as Record<string, { totalPages: number }>;
    expect(body.pagination.totalPages).toBe(0);
  });
});
