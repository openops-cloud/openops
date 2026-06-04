// import { getAiTelemetrySDK } from '@openops/common';
import {
  getRequestBody,
  logger,
  runWithLogContext,
  sendLogs,
} from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
// import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { executeEngine } from './lib/engine-executor';

// let telemetrySDK: NodeTracerProvider | undefined;

// export function initTelemetry(): void {
//   telemetrySDK = getAiTelemetrySDK();
//   telemetrySDK?.register();
// }
//
// export async function shutdownTelemetry(): Promise<void> {
//   return telemetrySDK?.shutdown();
// }

type EngineInput = {
  operationType: EngineOperationType;
  engineInput: Record<string, unknown>;
  deadlineTimestamp: number;
  requestId: string;
};

async function executeFromRedis(inputKey: string): Promise<string> {
  const input = await getRequestBody<EngineInput>(inputKey);
  logger.info(`Engine executing [${input.operationType}]`, {
    executionCorrelationId: input.requestId,
    operation: input.operationType,
  });

  return runWithLogContext(
    {
      deadlineTimestamp: input.deadlineTimestamp.toString(),
      executionCorrelationId: input.requestId,
      operationType: input.operationType,
    },
    () => executeEngine(input.engineInput, input.operationType),
  );
}

// initTelemetry();

if (process.send) {
  process.send({ type: 'ready' });

  process.on('message', (msg: { type: string; inputKey?: string }) => {
    if (msg.type === 'execute' && msg.inputKey) {
      void (async () => {
        try {
          const resultKey = await executeFromRedis(msg.inputKey!);
          if (process.send) {
            process.send({ type: 'result', resultKey });
          }

          await sendLogs();
          process.exit(0);
        } catch (error) {
          logger.error('Engine pool process failed', { error });
          if (process.send) {
            process.send({
              type: 'error',
              message: error instanceof Error ? error.message : String(error),
            });
          }

          await sendLogs();
          process.exit(1);
        }
      })();
    }
  });
} else {
  logger.error('Engine started without IPC channel — exiting');
  process.exit(1);
}
