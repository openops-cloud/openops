import { QueryKeys } from '@/app/constants/query-keys';
import { SSE_HEARTBEAT_INTERVAL_MS } from '@openops/shared';
import { ConnectionTimeoutError } from './connection-timeout-error';
import { ChatMode } from './types';

export const buildQueryKey = (
  selectedStep: string | undefined,
  flowVersionId: string | undefined,
  chatId: string | null,
  blockName: string | undefined,
  chatMode: ChatMode,
) => {
  const baseKey = [
    chatMode === ChatMode.StepSettings
      ? QueryKeys.openChat
      : QueryKeys.openAiAssistantChat,
    chatMode === ChatMode.StepSettings ? flowVersionId : chatId,
  ];

  if (selectedStep && blockName && chatMode === ChatMode.StepSettings) {
    baseKey.push(blockName);
  }

  if (selectedStep && chatMode === ChatMode.StepSettings) {
    baseKey.push(selectedStep);
  }

  return baseKey;
};

/**
 * Combines multiple AbortSignals into one.
 * Uses AbortSignal.any() if available, otherwise provides a polyfill.
 */
export const combineAbortSignals = (
  signals: (AbortSignal | undefined | null)[],
): AbortSignal => {
  const validSignals = signals.filter(
    (signal): signal is AbortSignal => signal !== undefined && signal !== null,
  );

  if (validSignals.length === 0) {
    return new AbortController().signal;
  }

  if (validSignals.length === 1) {
    return validSignals[0];
  }

  if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(validSignals);
  }

  const controller = new AbortController();

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  return controller.signal;
};

const SSE_MESSAGE_GAP_TIMEOUT_MS = SSE_HEARTBEAT_INTERVAL_MS * 4;
const RESPONSE_WARNING_MS = SSE_HEARTBEAT_INTERVAL_MS * 2;

let sseActivityCallback: (() => void) | null = null;
let sseWarningCallback: (() => void) | null = null;

export const setSSEActivityCallback = (callback: (() => void) | null): void => {
  sseActivityCallback = callback;
};

export const setSSEWarningCallback = (callback: (() => void) | null): void => {
  sseWarningCallback = callback;
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const timeoutController = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;
  let warningTimeoutId: NodeJS.Timeout | null = null;

  const resetTimeouts = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);

    warningTimeoutId = setTimeout(() => {
      if (sseWarningCallback) {
        sseWarningCallback();
      }
    }, RESPONSE_WARNING_MS);

    timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, SSE_MESSAGE_GAP_TIMEOUT_MS);
  };

  const clearTimeouts = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (warningTimeoutId) clearTimeout(warningTimeoutId);
  };

  resetTimeouts();

  try {
    const combinedSignal = combineAbortSignals([
      init?.signal,
      timeoutController.signal,
    ]);

    const response = await fetch(input, {
      ...init,
      signal: combinedSignal,
    });

    if (response.body) {
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                clearTimeouts();
                controller.close();
                break;
              }

              resetTimeouts();
              if (sseActivityCallback) {
                sseActivityCallback();
              }

              controller.enqueue(value);
            }
          } catch (error) {
            clearTimeouts();
            controller.error(error);
          }
        },
        cancel() {
          clearTimeouts();
          reader.cancel();
        },
      });

      return new Response(stream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response;
  } catch (error: any) {
    clearTimeouts();

    if (timeoutController.signal.aborted && !init?.signal?.aborted) {
      throw new ConnectionTimeoutError(
        'Connection timeout: No response from server.',
      );
    }

    throw error;
  }
};
