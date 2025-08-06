/**
 * Utility functions to build streaming messages for the AI SDK protocol
 */

/**
 * Builds a text message (type 0)
 */
export function buildTextMessage(text: string): string {
  return `0:${JSON.stringify(text)}\n\n`;
}

export function buildTextDeltaPart(text: string, id: string): string {
  return `data: ${JSON.stringify({
    type: 'text-delta',
    id,
    delta: text,
  })}\n\n`;
}

// data: {"type":"text-delta","id":"msg_68679a454370819ca74c8eb3d04379630dd1afb72306ca5d","delta":"Hello"}

/**
 * Builds a tool call message (type 9)
 */
export function buildToolCallMessage(toolCall: unknown): string {
  return `9:${JSON.stringify(toolCall)}\n\n`;
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
  })}\n\n`;
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
  })}\n\n`;
}

/**
 * Builds a tool result message (type a)
 */
export function buildToolResultMessage(toolResult: unknown): string {
  return `a:${JSON.stringify(toolResult)}\n\n`;
}

/**
 * Builds a finish message (type e)
 */
export function buildFinishMessage(finishReason: string): string {
  return `e:${JSON.stringify({
    finishReason,
  })}\n\n`;
}

/**
 * Builds a done message (type d)
 */
export function buildDoneMessage(finishReason: string): string {
  return `d:${JSON.stringify({
    finishReason,
  })}\n\n`;
}

export const finishMessagePart = `data: ${JSON.stringify({
  type: 'finish',
})}`;

export const doneMarker = 'data: [DONE]';

export const startStepPart = `data: ${JSON.stringify({
  type: 'start-step',
})}\n\n`;

export const finishStepPart = `data: ${JSON.stringify({
  type: 'finish-step',
})}`;

/**
 * Builds a message ID message (type f)
 */
export function buildMessageIdMessage(messageId: string): string {
  return `data: ${JSON.stringify({ type: 'start', messageId })}\n\n`;
}

export function buildTextStartMessage(messageId: string): string {
  return `data: ${JSON.stringify({
    type: 'text-start',
    id: messageId,
  })}\n\n`;
}

export function buildTextEndMessage(messageId: string): string {
  return `data: ${JSON.stringify({
    type: 'text-end',
    id: messageId,
  })}\n\n`;
}
