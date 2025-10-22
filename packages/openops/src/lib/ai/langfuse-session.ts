import { updateActiveTrace } from '@langfuse/tracing';
import { logger } from '@openops/server-shared';
import { isLLMTelemetryEnabled } from './providers';

/**
 * Sets the sessionId on the active Langfuse trace.
 * This groups all traces from the same chat session together in Langfuse.
 *
 * Uses the Langfuse SDK's updateActiveTrace() which works with the
 * LangfuseSpanProcessor to properly set session metadata.
 *
 * @param sessionId - The session identifier (e.g., chatId)
 * @param userId - Optional user identifier
 * @param input - Optional input to log with the trace
 */
export function setLangfuseSessionId(
  sessionId: string,
  userId?: string,
  input?: string,
): void {
  if (!isLLMTelemetryEnabled()) {
    return;
  }

  try {
    updateActiveTrace({
      sessionId,
      ...(userId ? { userId } : {}),
      ...(input ? { input } : {}),
    });

    logger.info(`Set Langfuse session ID: ${sessionId}`);
  } catch (error) {
    logger.error('Failed to set Langfuse session ID', error);
  }
}

/**
 * Wraps an async operation with Langfuse session tracking.
 * Sets the session ID on the active trace before executing the function.
 *
 * @param sessionId - The session identifier (e.g., chatId)
 * @param userId - Optional user identifier
 * @param input - Optional input to log with the trace
 * @param fn - Async function to execute
 * @returns The result of the async function
 */
export async function withLangfuseSession<T>(
  sessionId: string,
  userId: string | undefined,
  input: string | undefined,
  fn: () => Promise<T> | T,
): Promise<T> {
  if (!isLLMTelemetryEnabled()) {
    return await fn();
  }

  try {
    // Set session, user, and input on the active trace
    // This must be called BEFORE the AI SDK creates its spans
    setLangfuseSessionId(sessionId, userId, input);

    logger.info(`Started Langfuse session: ${sessionId}`);

    return await fn();
  } catch (error) {
    logger.error('Error in Langfuse session', error);
    throw error;
  }
}
