import { ModelMessage, ToolModelMessage, ToolResultPart } from 'ai';
import { MessageWithMergedToolResults, ToolCallPartWithResult } from './types';

/**
 * Merges tool result messages into their corresponding assistant tool-call parts.
 * This function finds each 'tool' message, locates the matching 'tool-call' part by toolCallId,
 * and assigns the result to the 'result' property.
 */
export function mergeToolResultsIntoMessages(
  messages: ModelMessage[],
): MessageWithMergedToolResults[] {
  const merged: MessageWithMergedToolResults[] = [];

  for (const msg of messages) {
    if (
      isToolMessage(msg) &&
      shouldSkipToolMessage(msg as ToolModelMessage, merged)
    ) {
      continue;
    }

    const normalizedMsg = normalizeMessage(msg);
    merged.push(normalizedMsg);
  }

  return merged;
}

function isToolMessage(msg: ModelMessage): boolean {
  return (
    msg.role === 'tool' && Array.isArray(msg.content) && msg.content.length > 0
  );
}

/**
 * Check if a tool message should be skipped (merged into assistant message)
 */
function shouldSkipToolMessage(
  msg: ToolModelMessage,
  merged: MessageWithMergedToolResults[],
): boolean {
  const toolResult = msg.content[0];
  const toolCallId = toolResult?.toolCallId;

  if (!toolCallId) {
    return false;
  }

  return mergeToolResultIntoAssistant(toolResult, merged);
}

/**
 * Merge tool result into the corresponding assistant message
 */
function mergeToolResultIntoAssistant(
  toolResult: ToolResultPart,
  merged: MessageWithMergedToolResults[],
): boolean {
  for (let j = merged.length - 1; j >= 0; j--) {
    const prev = merged[j];
    if (prev.role === 'assistant' && Array.isArray(prev.content)) {
      const toolCallPart = prev.content.find(
        (part) =>
          part.type === 'tool-call' &&
          part.toolCallId === toolResult.toolCallId,
      );
      if (toolCallPart) {
        (toolCallPart as ToolCallPartWithResult).output = toolResult.output;
        return true;
      }
    }
  }
  return false;
}

/**
 * Normalize message content to consistent format
 */
function normalizeMessage(msg: ModelMessage): MessageWithMergedToolResults {
  const normalizedMsg = { ...msg } as MessageWithMergedToolResults;

  if (msg.content == null) {
    normalizedMsg.content = [];
  } else if (typeof msg.content === 'string') {
    normalizedMsg.content = [
      {
        type: 'text',
        text: msg.content,
      },
    ];
  } else if (Array.isArray(msg.content)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    normalizedMsg.content = normalizeContentArray(msg.content as any[]);
  } else if (msg.content && typeof msg.content === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    normalizedMsg.content = [msg.content as any];
  } else {
    normalizedMsg.content = [];
  }

  return normalizedMsg;
}

/**
 * Normalize content array to ensure consistent structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeContentArray(content: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return content.map((part: any) => {
    if (typeof part === 'string') {
      return {
        type: 'text',
        text: part,
      };
    }
    return part;
  });
}
