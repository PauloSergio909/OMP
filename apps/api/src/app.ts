import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { prisma } from './config/database';
import { redis } from './config/redis';

import { authRoutes } from './modules/auth/auth.routes';
import { estoqueRoutes } from './modules/estoque/estoque.routes';
import { frotaRoutes } from './modules/frota/frota.routes';
import { ordemServicoRoutes } from './modules/ordem-servico/os.routes';
import { funcionariosRoutes } from './modules/funcionarios/funcionarios.routes';
import { abastecimentoRoutes } from './modules/abastecimento/abastecimento.routes';
import { equipamentosRoutes } from './modules/equipamentos/equipamentos.routes';
import { comprasRoutes } from './modules/compras/compras.routes';
import { configuracoesRoutes } from './modules/configuracoes/configuracoes.routes';
import { agendaRoutes } from './modules/agenda/agenda.routes';
import { pneusRoutes } from './modules/pneus/pneus.routes';
import { checklistsRoutes } from './modules/checklists/checklists.routes';
import { searchRoutes } from './modules/search/search.routes';
import { adminRoutes } from './modules/admin/admin.routes';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    bodyLimit: 1_048_576, // 1 MB
    connectionTimeout: 30_000,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'FleetMaster API',
        description: 'API de gestão de frota, estoque e manutenção',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
    staticCSP: true,
  });

  const allowedOrigins: string[] = env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : env.ALLOWED_ORIGIN
      ? env.ALLOWED_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
      : [];

  app.log.info({ allowedOrigins }, 'CORS origins');

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.setErrorHandler(errorHandler);

  app.get('/api/health', async (_request, reply) => {
    const [dbOk, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      redis ? redis.ping().then((r) => r === 'PONG').catch(() => false) : null,
    ]);

    const status = dbOk ? 'ok' : 'degraded';
    const mem = process.memoryUsage();

    return reply.status(dbOk ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: env.NODE_ENV,
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk === null ? 'disabled' : redisOk ? 'ok' : 'error',
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
    });
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(estoqueRoutes, { prefix: '/api/estoque' });
  await app.register(frotaRoutes, { prefix: '/api/frota' });
  await app.register(ordemServicoRoutes, { prefix: '/api/ordens-servico' });
  await app.register(funcionariosRoutes, { prefix: '/api/funcionarios' });
  await app.register(abastecimentoRoutes, { prefix: '/api/abastecimentos' });
  await app.register(equipamentosRoutes, { prefix: '/api/equipamentos' });
  await app.register(comprasRoutes, { prefix: '/api/compras' });
  await app.register(configuracoesRoutes, { prefix: '/api/configuracoes' });
  await app.register(agendaRoutes, { prefix: '/api/agenda' });
  await app.register(pneusRoutes, { prefix: '/api/pneus' });
  await app.register(checklistsRoutes, { prefix: '/api/checklists' });
  await app.register(searchRoutes, { prefix: '/api/search' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
