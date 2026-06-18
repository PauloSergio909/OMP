
import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// redis só é instanciado se REDIS_URL estiver definida.
// Atualmente nenhum módulo usa o client — mantido aqui para uso futuro.
export const redis: Redis | null = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    })
  : null;

if (redis) {
  redis.on('connect', () => {
    logger.info('Redis conectado com sucesso');
  });

  redis.on('error', (error) => {
    logger.error('Erro no Redis', { message: error.message });
  });
} else {
  logger.info('REDIS_URL não definida — Redis desabilitado');
}
