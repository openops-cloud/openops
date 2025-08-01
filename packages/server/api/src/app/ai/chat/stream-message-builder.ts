/**
 * Utility functions to build streaming messages for the AI SDK protocol
 */

/**
 * Builds a text message (type 0)
 */
export function buildTextMessage(text: string): string {
  return `0:${JSON.stringify(text)}\n`;
}

/**
 * Builds a tool call message (type 9)
 */
export function buildToolCallMessage(toolCall: unknown): string {
  return `9:${JSON.stringify(toolCall)}\n`;
}

/**
 * Builds a tool call streaming start message (type b)
 */
export function buildToolCallStreamingStartMessage(
  toolCallId: string,
  toolName: string,
): string {
  return `b:${JSON.stringify({
    type: 'tool-call-streaming-start',
    toolCallId,
    toolName,
  })}\n`;
}

/**
 * Builds a tool call delta message (type c)
 */
export function buildToolCallDeltaMessage(
  toolCallId: string,
  toolName: string,
  argsTextDelta: string,
): string {
  return `c:${JSON.stringify({
    type: 'tool-call-delta',
    toolCallId,
    toolName,
    argsTextDelta,
  })}\n`;
}

/**
 * Builds a tool result message (type a)
 */
export function buildToolResultMessage(toolResult: unknown): string {
  return `a:${JSON.stringify(toolResult)}\n`;
}

/**
 * Builds a finish message (type e)
 */
export function buildFinishMessage(finishReason: string): string {
  return `e:${JSON.stringify({
    finishReason,
  })}\n`;
}

/**
 * Builds a done message (type d)
 */
export function buildDoneMessage(finishReason: string): string {
  return `d:${JSON.stringify({
    finishReason,
  })}\n`;
}

/**
 * Builds a message ID message (type f)
 */
export function buildMessageIdMessage(messageId: string): string {
  return `f:${JSON.stringify({ messageId })}\n`;
}
