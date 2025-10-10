import { isLLMTelemetryEnabled } from '@openops/common';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { Static, Type } from '@sinclair/typebox';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { LangfuseExporter } from 'langfuse-vercel';
import * as process from 'node:process';
import { start } from './api-handler';
import { lambdaHandler } from './lambda-handler';
import { EngineConstants } from './lib/handler/context/engine-constants';

export const EngineRequest = Type.Object({
  requestId: Type.String(),
  engineInput: Type.Unknown(),
  deadlineTimestamp: Type.Number(),
  operationType: Type.Enum(EngineOperationType),
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

let telemetrySDK: NodeSDK | undefined;

function initTelemetry(): void {
  telemetrySDK = isLLMTelemetryEnabled()
    ? new NodeSDK({
        traceExporter: new LangfuseExporter({
          secretKey: system.get(SharedSystemProp.LANGFUSE_SECRET_KEY),
          publicKey: system.get(SharedSystemProp.LANGFUSE_PUBLIC_KEY),
          baseUrl: system.get(SharedSystemProp.LANGFUSE_HOST),
          environment: system.get(SharedSystemProp.ENVIRONMENT_NAME),
        }) as unknown as SpanExporter,
        instrumentations: [getNodeAutoInstrumentations()],
      })
    : undefined;
  telemetrySDK?.start();
}

initTelemetry();

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
