import { buildApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startAlertasJob } from './jobs/alertas.job';
import { startRelatorioJob } from './jobs/relatorio.job';

async function main() {
  await connectDatabase();

  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 FleetMaster API rodando em http://localhost:${env.PORT}`);
    logger.info(`📋 Health check: http://localhost:${env.PORT}/api/health`);
    logger.info(`🔧 Ambiente: ${env.NODE_ENV}`);
    startAlertasJob();
    startRelatorioJob();
  } catch (error) {
    logger.error('Falha ao iniciar o servidor:', error);
    process.exit(1);
  }

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} recebido. Encerrando servidor...`);
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main();
