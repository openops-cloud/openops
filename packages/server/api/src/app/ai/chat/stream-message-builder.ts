/**
 * Utility functions to build streaming messages for the AI SDK protocol
 */

function createStreamMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function buildTextDeltaPart(text: string, id: string): string {
  return createStreamMessage({
    type: 'text-delta',
    id,
    delta: text,
  });
}

export function buildToolInputStartMessage(
  toolCallId: string,
  toolName: string,
): string {
  return createStreamMessage({
    type: 'tool-input-start',
    toolCallId,
    toolName,
  });
}

export function buildToolInputAvailable(
  toolCallId: string,
  toolName: string,
  input: string,
): string {
  return createStreamMessage({
    type: 'tool-input-available',
    toolName,
    toolCallId,
    input,
  });
}

export function buildToolOutputAvailableMessage(
  toolCallId: string,
  output: unknown,
): string {
  return createStreamMessage({
    type: 'tool-output-available',
    toolCallId,
    output,
  });
}

export const finishMessagePart = createStreamMessage({
  type: 'finish',
});

export const doneMarker = 'data: [DONE]\n\n';

export const startStepPart = createStreamMessage({
  type: 'start-step',
});

export const finishStepPart = createStreamMessage({
  type: 'finish-step',
});

export const startMessagePart = createStreamMessage({
  type: 'start',
});

export function buildTextStartMessage(messageId: string): string {
  return createStreamMessage({
    type: 'text-start',
    id: messageId,
  });
}

export function buildTextEndMessage(messageId: string): string {
  return createStreamMessage({
    type: 'text-end',
    id: messageId,
  });
}
