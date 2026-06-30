import { logger } from '@openops/server-shared';

/**
 * Messages the engine child process sends back to the worker over the IPC
 * channel once an operation completes.
 */
export type ParentMessage =
  | { type: 'result'; resultKey: string }
  | { type: 'error'; message: string };

/**
 * Sends a message to the worker and invokes `callback` once the IPC channel has
 * flushed the write (or with an error if it could not). Mirrors the signature
 * of `process.send`, decoupled so it can be injected in tests.
 */
export type ParentMessageSender = (
  message: ParentMessage,
  callback: (error: Error | null) => void,
) => void;

export type EngineOperationDeps = {
  execute: (inputKey: string) => Promise<string>;
  flushLogs: () => Promise<void>;
  send: ParentMessageSender;
  exit: (code: number) => void;
};

/**
 * Resolves only once `message` has been flushed to the IPC channel.
 *
 * `process.send` is asynchronous and `process.exit` aborts pending I/O, so
 * sending a message and exiting on the next line can drop the write before the
 * worker receives it. The worker then observes a clean exit with no result and
 * reports "Engine exited unexpectedly with code 0". Awaiting the send callback
 * guarantees the message is delivered before the caller exits.
 *
 * A send failure is logged but still resolves: the process is about to exit
 * regardless, and the worker already treats a missing result as a failure.
 */
export function sendMessageToParent(
  send: ParentMessageSender,
  message: ParentMessage,
): Promise<void> {
  return new Promise((resolve) => {
    send(message, (error) => {
      if (error) {
        logger.error('Failed to deliver engine message to worker before exit', {
          error,
          messageType: message.type,
        });
      }

      resolve();
    });
  });
}

/**
 * Executes one engine operation and reports the outcome to the worker, ensuring
 * the result/error message is flushed to the IPC channel before the process
 * exits (see {@link sendMessageToParent}).
 */
export async function runEngineOperation(
  inputKey: string,
  deps: EngineOperationDeps,
): Promise<void> {
  try {
    const resultKey = await deps.execute(inputKey);
    await deps.flushLogs();
    await sendMessageToParent(deps.send, { type: 'result', resultKey });
    deps.exit(0);
  } catch (error) {
    logger.error('Failed to execute engine operation', { error });

    await deps.flushLogs();
    await sendMessageToParent(deps.send, {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });

    deps.exit(1);
  }
}
