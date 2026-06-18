import { redis } from '../config/redis';

/**
 * Executa fn, armazenando o resultado no Redis por ttl segundos.
 * Se o Redis não estiver disponível, executa fn diretamente.
 */
export async function withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (!redis) return fn();

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const result = await fn();
  await redis.setex(key, ttlSeconds, JSON.stringify(result));
  return result;
}

/** Invalida uma chave de cache. No-op se Redis não estiver disponível. */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  await redis.del(key);
}

/** Invalida todas as chaves que correspondem ao padrão (usa SCAN, não KEYS). */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
