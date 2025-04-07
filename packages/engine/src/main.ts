import { logger } from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import * as process from 'node:process';
import { start } from './api-handler';
import { lambdaHandler } from './lambda-handler';
import { EngineConstants } from './lib/handler/context/engine-constants';

export const EngineRequest = Type.Object({
  operationType: Type.Enum(EngineOperationType),
  engineInput: Type.Object({}),
});

export type EngineRequest = Static<typeof EngineRequest>;

function installCodeBlockDependencies(): void {
  logger.info('Installing code block dependencies...');
  if (!existsSync(EngineConstants.BASE_CODE_DIRECTORY)) {
    mkdirSync(EngineConstants.BASE_CODE_DIRECTORY, { recursive: true });
  }

  execSync(
    'npm init -y && npm i @tsconfig/node20@20.1.4 @types/node@20.14.8 typescript@5.6.3',
    { cwd: EngineConstants.BASE_CODE_DIRECTORY },
  );
}

if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  logger.info('Running in a lambda environment, calling lambdaHandler...');
  exports.handler = lambdaHandler;
} else {
  installCodeBlockDependencies();
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.log(`Failed to start the engine ${err}`, err);
    process.exit(1);
  });
}
