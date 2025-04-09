/* eslint-disable no-console */
import { FastifyInstance } from 'fastify';
import { logger, sendLogs } from './logger/index';
import { SharedSystemProp, system } from './system';

let shuttingDown = false;
const stop = async (
  app: FastifyInstance,
  cleanup?: () => Promise<void>,
): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (system.getOrThrow(SharedSystemProp.ENVIRONMENT) === 'dev') {
    console.log('Dev mode, forcing shutdown after 500 ms');
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.exit(0);
  }

  try {
    if (cleanup) {
      await cleanup();
    }

    logger.info('Closing Fastify....');
    await app.close();
    await sendLogs();
    process.exit(0);
  } catch (err) {
    logger.error('Error stopping app', err);
    await sendLogs();
    process.exit(1);
  }
};

export function setStopHandlers(
  app: FastifyInstance,
  cleanup?: () => Promise<void>,
) {
  process.on('SIGINT', async () => {
    logger.warn('SIGINT received, shutting down');
    stop(app, cleanup).catch((e) => console.info('Failed to stop the app', e));
  });

  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received, shutting down');
    stop(app, cleanup).catch((e) => console.info('Failed to stop the app', e));
  });
}
