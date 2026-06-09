import { system } from '@openops/server-shared';
import { engineRunner as localEngineRunner } from './lib/engine';
import { EngineRunner } from './lib/engine/engine-runner';
import { remoteEngineRunner } from './lib/engine/remote-engine-runner';
export { engineExecutionController } from './lib/engine/engine-controller';
export * from './lib/engine/engine-pool';
export * from './lib/engine/engine-runner';
export * from './lib/engine/install-code-block-dependencies';
export * from './lib/executors/flow-job-executor';
export * from './lib/flow-worker';
export * from './lib/job-polling';
export * from './lib/utils/webhook-utils';

function resolveEngineRunner(): EngineRunner {
  if (system.isWorker()) {
    return localEngineRunner;
  }

  return remoteEngineRunner;
}

export const engineRunner: EngineRunner = resolveEngineRunner();
