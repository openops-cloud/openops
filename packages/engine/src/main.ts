import {
  getRequestBody,
  logger,
  runWithLogContext,
  sendLogs,
} from '@openops/server-shared';
import { EngineOperationType } from '@openops/shared';
import { executeEngine } from './lib/engine-executor';
import { runEngineOperation } from './lib/engine-ipc';

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

if (process.send) {
  const sendToParent = process.send.bind(process);
  sendToParent({ type: 'ready' });

  process.on('message', (msg: { type: string; inputKey?: string }) => {
    if (msg.type === 'execute' && msg.inputKey) {
      void runEngineOperation(msg.inputKey, {
        execute: executeFromRedis,
        flushLogs: sendLogs,
        send: (message, callback) => {
          sendToParent(message, callback);
        },
        exit: (code) => {
          process.exit(code);
        },
      });
    }
  });
} else {
  logger.error('Engine started without IPC channel — exiting');
  process.exit(1);
}
