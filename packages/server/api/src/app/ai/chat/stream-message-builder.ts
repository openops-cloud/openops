/**
 * Utility functions to build streaming messages for the AI SDK protocol
 */

export function buildTextDeltaPart(text: string, id: string): string {
  return `data: ${JSON.stringify({
    type: 'text-delta',
    id,
    delta: text,
  })}\n\n`;
}

export function buildToolInputStartMessage(
  toolCallId: string,
  toolName: string,
): string {
  return `data: ${JSON.stringify({
    type: 'tool-input-start',
    toolCallId,
    toolName,
  })}\n\n`;
}

export function buildToolInputAvailable(
  toolCallId: string,
  toolName: string,
  input: string,
): string {
  return `data: ${JSON.stringify({
    type: 'tool-input-available',
    toolName,
    toolCallId,
    input,
  })}\n\n`;
}

export function buildToolOutputAvailableMessage(
  toolCallId: string,
  output: unknown,
): string {
  return `data: ${JSON.stringify({
    type: 'tool-output-available',
    toolCallId,
    output,
  })}\n\n`;
}

export const finishMessagePart = `data: ${JSON.stringify({
  type: 'finish',
})}\n\n`;

export const doneMarker = 'data: [DONE]\n\n';

export const startStepPart = `data: ${JSON.stringify({
  type: 'start-step',
})}\n\n`;

export const finishStepPart = `data: ${JSON.stringify({
  type: 'finish-step',
})}\n\n`;

export const startMessagePart = `data: ${JSON.stringify({
  type: 'start',
})}\n\n`;

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
