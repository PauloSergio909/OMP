import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { loginSchema, updateProfileSchema, updatePasswordSchema, paginationSchema, updateAdminUserSchema, createUserByAdminSchema } from '@fleetmaster/shared';
import { sendSuccess, sendError, sendCreated, sendPaginated } from '../../utils/response';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { auditar } from '../../middleware/auditoria.middleware';
import { env } from '../../config/env';
import { redis } from '../../config/redis';

const authService = new AuthService();

function makeAccessToken(app: FastifyInstance, user: { id: string; email: string; nome: string; role: string; funcionarioId?: string | null }) {
  return app.jwt.sign(
    { id: user.id, email: user.email, nome: user.nome, role: user.role, funcionarioId: user.funcionarioId ?? null },
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: [authGuard, roleGuard(['admin'])] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const result = await authService.listarUsuarios(params);
    return sendPaginated(reply, result.usuarios, result.total, params.page, params.perPage);
  });

  app.post('/users', { preHandler: [authGuard, roleGuard(['admin']), auditar({ acao: 'criar', entidade: 'Usuario' })] }, async (request, reply) => {
    const data = createUserByAdminSchema.parse(request.body);
    const user = await authService.criarUsuario(data);
    return sendCreated(reply, user, 'Usuário criado');
  });

  app.patch('/users/:id', { preHandler: [authGuard, roleGuard(['admin']), auditar({ acao: 'editar', entidade: 'Usuario', getEntidadeId: (req) => (req.params as { id: string }).id })] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateAdminUserSchema.parse(request.body);
    const user = await authService.atualizarUsuario(id, body);
    return sendSuccess(reply, user, 'Usuário atualizado');
  });

  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({
          error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        }),
      },
    },
  }, async (request, reply) => {
    const data = loginSchema.parse(request.body);
    const user = await authService.validateLogin(data);

    if (!user) {
      return sendError(reply, 'Email ou senha incorretos', 401);
    }

    const accessToken = makeAccessToken(app, user);

    const refreshToken = app.jwt.sign(
      { id: user.id, type: 'refresh' },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    );

    return sendSuccess(reply, {
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    }, 'Login realizado com sucesso');
  });

  app.post('/logout', { preHandler: [authGuard] }, async (request, reply) => {
    const payload = request.user as { id: string; iat: number; exp: number };
    if (redis && payload.iat && payload.exp) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`blocklist:${payload.id}:${payload.iat}`, ttl, '1');
      }
    }
    return sendSuccess(reply, null, 'Logout realizado com sucesso');
  });

  app.put('/profile', { preHandler: [authGuard, auditar({ acao: 'editar_perfil', entidade: 'Usuario', getEntidadeId: (req) => (req.user as { id: string }).id })] }, async (request, reply) => {
    const user = request.user as { id: string };
    const data = updateProfileSchema.parse(request.body);
    const updated = await authService.updateProfile(user.id, data);
    return sendSuccess(reply, updated, 'Perfil atualizado com sucesso');
  });

  app.put('/password', { preHandler: [authGuard, auditar({ acao: 'alterar_senha', entidade: 'Usuario', getEntidadeId: (req) => (req.user as { id: string }).id })] }, async (request, reply) => {
    const user = request.user as { id: string };
    const data = updatePasswordSchema.parse(request.body);
    await authService.updatePassword(user.id, data);
    return sendSuccess(reply, null, 'Senha alterada com sucesso');
  });

  app.post('/refresh', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }),
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    try {
      const decoded = app.jwt.verify(refreshToken) as { id: string; type: string };

      if (decoded.type !== 'refresh') {
        return sendError(reply, 'Token inválido', 401);
      }

      const user = await authService.findById(decoded.id);

      if (!user || !user.ativo) {
        return sendError(reply, 'Usuário não encontrado ou desativado', 401);
      }

      const newAccessToken = makeAccessToken(app, user);

      return sendSuccess(reply, { accessToken: newAccessToken });
    } catch (err) {
      if (err instanceof Error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
        return sendError(reply, 'Refresh token inválido ou expirado', 401);
      }
      throw err;
    }
  });
}


