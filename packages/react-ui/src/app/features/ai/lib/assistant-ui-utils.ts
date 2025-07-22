import { ThreadMessageLike } from '@assistant-ui/react';

interface MessageContentPart {
  type: string;
  text?: string;
  toolCallId?: string;
  result?: any;
  [key: string]: any;
}

/**
 * Message content can be either a string or an array of content parts
 */
type MessageContent = string | MessageContentPart[];

interface ServerMessage {
  role: string;
  content: MessageContent;
  id?: string;
  createdAt?: Date;
  annotations?: any[];
}

/**
 * Normalized message structure for assistant-ui
 */
interface NormalizedMessage extends Omit<ServerMessage, 'content'> {
  content: MessageContentPart[];
}

/**
 * Tool result structure
 */
interface ToolResult {
  toolCallId: string;
  result: any;
  type?: string;
}

/**
 * Merges tool result messages into their corresponding assistant tool-call parts.
 *
 * The AI SDK and assistant-ui expect tool results to be attached as a 'result' property
 * on the relevant 'tool-call' part within the assistant message, not as separate 'tool' messages.
 * This function finds each 'tool' message, locates the matching 'tool-call' part by toolCallId,
 * and assigns only the actual result payload (not the whole toolResult object) to the 'result' property.
 *
 * @param {ServerMessage[]} messages - The array of chat messages (user, assistant, tool, etc.)
 * @returns {ThreadMessageLike[]} The array of messages with tool results merged into assistant messages.
 */
export function mergeToolResults(
  messages: ServerMessage[],
): ThreadMessageLike[] {
  const merged: NormalizedMessage[] = [];

  for (const msg of messages) {
    if (isToolMessage(msg) && shouldSkipToolMessage(msg, merged)) {
      continue;
    }

    const normalizedMsg = normalizeMessage(msg);
    merged.push(normalizedMsg);
  }

  return merged as ThreadMessageLike[];
}

function isToolMessage(msg: ServerMessage): boolean {
  return (
    msg.role === 'tool' && Array.isArray(msg.content) && msg.content.length > 0
  );
}

/**
 * Check if a tool message should be skipped (merged into assistant message)
 */
function shouldSkipToolMessage(
  msg: ServerMessage,
  merged: NormalizedMessage[],
): boolean {
  const toolResult = msg.content[0] as ToolResult;
  const toolCallId = toolResult?.toolCallId;

  if (!toolCallId) {
    return false;
  }

  mergeToolResultIntoAssistant(toolResult, merged);

  return true;
}

/**
 * Merge tool result into the corresponding assistant message
 */
function mergeToolResultIntoAssistant(
  toolResult: ToolResult,
  merged: NormalizedMessage[],
): boolean {
  for (let j = merged.length - 1; j >= 0; j--) {
    const prev = merged[j];
    if (prev.role === 'assistant' && Array.isArray(prev.content)) {
      const toolCallPart = prev.content.find(
        (part: MessageContentPart) =>
          part.type === 'tool-call' &&
          part.toolCallId === toolResult.toolCallId,
      );
      if (toolCallPart) {
        toolCallPart.result = toolResult.result;
        return true;
      }
    }
  }
  return false;
}

/**
 * Normalize message content to consistent format
 */
function normalizeMessage(msg: ServerMessage): NormalizedMessage {
  const normalizedMsg: NormalizedMessage = { ...msg, content: [] };

  if (typeof msg.content === 'string') {
    normalizedMsg.content = [
      {
        type: 'text',
        text: msg.content,
      },
    ];
  } else if (Array.isArray(msg.content)) {
    normalizedMsg.content = normalizeContentArray(msg.content);
  } else if (msg.content && typeof msg.content === 'object') {
    normalizedMsg.content = [msg.content as MessageContentPart];
  }

  return normalizedMsg;
}

/**
 * Normalize content array to ensure consistent structure
 */
function normalizeContentArray(
  content: (MessageContentPart | string)[],
): MessageContentPart[] {
  return content.map((part: MessageContentPart | string) => {
    if (typeof part === 'string') {
      return {
        type: 'text',
        text: part,
      };
    }
    return part;
  });
}
