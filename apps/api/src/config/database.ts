import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Banco de dados conectado com sucesso');
  } catch (error) {
    logger.error('Falha ao conectar no banco de dados', { error });
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Banco de dados desconectado');
}
 
 export async function testDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect(); 
    logger.info('Teste de conexão com o banco de dados bem-sucedido');
  } catch (error) {
    logger.error('Falha ao testar conexão com o banco de dados', { error });
    process.exit(1);
  }
 }
