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
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    console.log('Dev mode, forcing shutdown after 1000 ms');
    await sleep(5000);
    await app.close();
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
