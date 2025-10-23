import { QueryKeys } from '@/app/constants/query-keys';
import { ConnectionTimeoutError } from './connection-timeout-error';
import { SERVER_HEARTBEAT_INTERVAL_MS } from './constants';
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

const CONNECTION_TIMEOUT_MS = 15000 + SERVER_HEARTBEAT_INTERVAL_MS;

/**
 * Custom fetch implementation with connection timeout.
 * Aborts the request if no response is received within the timeout period.
 */
export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, CONNECTION_TIMEOUT_MS);

  try {
    const combinedSignal = combineAbortSignals([
      init?.signal,
      timeoutController.signal,
    ]);

    const response = await fetch(input, {
      ...init,
      signal: combinedSignal,
    });

    return response;
  } catch (error: any) {
    if (timeoutController.signal.aborted && !init?.signal?.aborted) {
      throw new ConnectionTimeoutError(
        t(
          'Connection timeout: Unable to reach the server. Please check your internet connection.',
        ),
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
