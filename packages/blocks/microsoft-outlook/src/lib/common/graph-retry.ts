import { GraphError } from '@microsoft/microsoft-graph-client';
import { logger } from '@openops/server-shared';

export type RetryOptions = {
  maxRetries: number;
  initialDelayMs: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

export async function withGraphRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, initialDelayMs, shouldRetry, onRetry } = options;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;

      if (!shouldRetry(e) || i === maxRetries - 1) {
        throw e;
      }

      const delay = initialDelayMs * Math.pow(2, i);
      if (onRetry) {
        onRetry(e, i + 1, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_INITIAL_DELAY_MS = 1000;

export type MicrosoftGraphRetryOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
};

export async function microsoftGraphRetry<T>(
  fn: () => Promise<T>,
  options: MicrosoftGraphRetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  } = options;

  return withGraphRetry(fn, {
    maxRetries,
    initialDelayMs,
    shouldRetry: (e) => {
      const isGraphError = e instanceof GraphError;
      const statusCode = isGraphError ? e.statusCode : undefined;
      return statusCode !== undefined && statusCode >= 500;
    },
    onRetry: (e, attempt, delay) => {
      const isGraphError = e instanceof GraphError;
      const statusCode = isGraphError ? e.statusCode : undefined;
      logger.warn(
        `Transient Microsoft Graph error ${statusCode} occurred. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`,
      );
    },
  });
}
