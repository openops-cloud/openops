import { propagateAttributes } from '@langfuse/tracing';
import { isLLMTelemetryEnabled } from './providers';

export type LangfuseSessionAttributes = {
  /** The session identifier (e.g., chatId) */
  sessionId: string;
  /** Optional user identifier */
  userId?: string;
  /** Optional trace name, used to group and filter the session's observations */
  traceName?: string;
};

/**
 * Runs an async operation inside a Langfuse session scope.
 *
 * Langfuse v4 stores trace-level attributes (sessionId, userId, traceName) on
 * every observation instead of on the trace, so they must be propagated before
 * any observation is created. Every span started inside `fn` (including the
 * root observation and the cost-bearing LLM generations) inherits them.
 *
 * @param attributes - Trace-level attributes to propagate
 * @param fn - Async function to execute
 * @returns The result of the async function
 */
export async function withLangfuseSession<T>(
  attributes: LangfuseSessionAttributes,
  fn: () => Promise<T> | T,
): Promise<T> {
  if (!isLLMTelemetryEnabled()) {
    return await fn();
  }

  return await propagateAttributes(attributes, fn);
}
