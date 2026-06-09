import {
  blocksBuilder,
  logger,
  system,
  WorkerSystemProps,
} from '@openops/server-shared';
import { isNil, WorkerMachineType } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import {
  engineExecutionController,
  flowWorker,
  initEnginePool,
  installCodeBlockDependencies,
  shutdownEnginePool,
} from 'server-worker';
import { accessTokenManager } from './authentication/context/access-token-manager';

export const setupWorker = async (app: FastifyInstance): Promise<void> => {
  const workerToken = await generateWorkerToken();
  await flowWorker.init(workerToken);
  initEnginePool();

  app.addHook('onClose', async () => {
    logger.info('Worker shutting down');
    await shutdownEnginePool();
    await flowWorker.close();
  });

  await app.register(engineExecutionController, { prefix: '/v1/engine' });

  await blocksBuilder();

  // Install TypeScript dependencies needed by Code blocks
  installCodeBlockDependencies();
};

export async function workerPostBoot(): Promise<void> {
  logger.info('Worker started');
  await flowWorker.start();
}

async function generateWorkerToken(): Promise<string> {
  const workerToken = system.get(WorkerSystemProps.WORKER_TOKEN);
  if (!isNil(workerToken)) {
    return workerToken;
  }

  return accessTokenManager.generateWorkerToken({
    type: WorkerMachineType.SHARED,
    organizationId: null,
  });
}
