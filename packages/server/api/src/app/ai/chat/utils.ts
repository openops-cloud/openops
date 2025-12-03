/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelMessage, ToolResultPart, ToolSet, UIMessage } from 'ai';

/**
 * Merges tool result messages into their corresponding assistant tool-call parts
 * and converts them to UI messages in a single pass.
 * This function finds each 'tool' message, locates the matching 'tool-call' part by toolCallId,
 * and assigns the result to the 'output' property.
 */
export function mergeToolResultsIntoMessages(
  messages: ModelMessage[],
  options?: {
    tools?: ToolSet;
  },
): Array<Omit<UIMessage, 'id'>> {
  const uiMessages: Array<Omit<UIMessage, 'id'>> = [];
  const toolResultsToMerge: Array<{
    toolResult: ToolResultPart;
    messageIndex: number;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (isToolMessage(msg)) {
      if (Array.isArray(msg.content) && msg.content.length > 0) {
        const toolResult = msg.content[0];
        if (
          toolResult &&
          typeof toolResult === 'object' &&
          'toolCallId' in toolResult
        ) {
          toolResultsToMerge.push({
            toolResult: toolResult as ToolResultPart,
            messageIndex: i,
          });
        }
      }
      continue;
    }

    const convertedMessage = convertMessageToUI(msg, options?.tools);
    if (convertedMessage) {
      uiMessages.push(convertedMessage);
    }
  }

  for (const { toolResult } of toolResultsToMerge) {
    mergeToolResultIntoUIMessage(toolResult, uiMessages);
  }

  return uiMessages;
}

/**
 * Sanitize chat history for secondary tasks like naming/summarization.
 * - keeps only 'user' and 'assistant' roles
 * - strips tool calls and non-text parts
 * - merges multiple text parts into a single string with newlines
 */
export function sanitizeMessagesForChatName(
  messages: ModelMessage[],
): ModelMessage[] {
  const isSupportedRole = (m: ModelMessage) =>
    m.role === 'user' || m.role === 'assistant';

  const extractText = (content: ModelMessage['content']): string | null => {
    if (typeof content === 'string') {
      const text = content.trim();
      return text ? text : null;
    }

    if (Array.isArray(content)) {
      const merged = (content as Array<unknown>)
        .reduce<string[]>((acc, part) => {
          if (
            part &&
            typeof part === 'object' &&
            'type' in (part as Record<string, unknown>)
          ) {
            const p = part as { type?: string; text?: string };
            if (p.type === 'text' && typeof p.text === 'string') {
              acc.push(p.text);
            }
          }
          return acc;
        }, [])
        .join('\n')
        .trim();

      return merged ? merged : null;
    }

    return null;
  };

  return messages
    .filter(isSupportedRole)
    .map((m) => {
      const text = extractText(m.content);
      return text ? ({ role: m.role, content: text } as ModelMessage) : null;
    })
    .filter((m): m is ModelMessage => m !== null);
}

function isToolMessage(msg: ModelMessage): boolean {
  return (
    msg.role === 'tool' && Array.isArray(msg.content) && msg.content.length > 0
  );
}

/**
 * Converts a single message to UI format
 */
function convertMessageToUI(
  message: ModelMessage,
  tools?: ToolSet,
): Omit<UIMessage, 'id'> | null {
  switch (message.role) {
    case 'system':
      return {
        role: 'system',
        parts: [
          {
            type: 'text',
            text: typeof message.content === 'string' ? message.content : '',
            state: 'done',
          },
        ],
      };

    case 'user':
      return {
        role: 'user',
        parts: convertUserMessageContentToUI(
          message.content,
          message.providerOptions,
        ),
      };

    case 'assistant':
      return {
        role: 'assistant',
        parts: convertAssistantMessageContentToUI(
          message.content,
          tools,
          message.providerOptions,
        ),
      };

    default:
      return null;
  }
}

/**
 * Converts user message content to UI parts
 */
function convertUserMessageContentToUI(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: string | any[],
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPartUI(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPartUI(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePartUI(part, part.providerOptions));
          break;
        case 'image':
          parts.push(createImagePartUI(part, part.providerOptions));
          break;
        default:
          // Skip unsupported parts
          break;
      }
    }
  }

  return parts;
}

/**
 * Converts assistant message content to UI parts
 */
function convertAssistantMessageContentToUI(
  content: string | any[],
  tools?: ToolSet,
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPartUI(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPartUI(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePartUI(part, part.providerOptions));
          break;
        case 'image':
          parts.push(createImagePartUI(part, part.providerOptions));
          break;
        case 'reasoning':
          parts.push({
            type: 'reasoning',
            text: part.text,
            state: 'done',
            ...(part.providerOptions != null
              ? { providerMetadata: part.providerOptions }
              : {}),
          });
          break;
        case 'tool-call':
          parts.push(createToolCallPartUI(part, tools));
          break;
        default:
          // Skip unsupported parts
          break;
      }
    }
  }

  return parts;
}

/**
 * Creates a text part for UI
 */
function createTextPartUI(
  text: string,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'text',
    text,
    state: 'done',
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates a file part for UI
 */
function createFilePartUI(
  part: any,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'file',
    mediaType: part.mediaType,
    filename: part.filename,
    url: typeof part.data === 'string' ? part.data : part.data.toString(),
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates an image part for UI
 */
function createImagePartUI(
  part: any,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'file',
    mediaType: part.mediaType ?? 'image/jpeg',
    url: typeof part.image === 'string' ? part.image : part.image.toString(),
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates a tool call part for UI
 */
function createToolCallPartUI(
  part: any,
  tools?: ToolSet,
): UIMessage['parts'][0] {
  const toolName = part.toolName;
  const tool = tools?.[toolName];
  const rawOutput = part.output ?? part.result;
  const hasOutput = rawOutput != null;
  const normalizedOutput =
    rawOutput != null && typeof rawOutput === 'object' && 'value' in rawOutput
      ? rawOutput.value
      : rawOutput;

  const base: any = {
    toolCallId: part.toolCallId,
    state: hasOutput
      ? ('output-available' as const)
      : ('input-available' as const),
    input: part.input as Record<string, unknown>,
    ...(hasOutput ? { output: normalizedOutput } : {}),
    ...(part.providerOptions != null
      ? { callProviderMetadata: part.providerOptions }
      : {}),
  };

  if (tool) {
    base.type = `tool-${toolName}` as any;
    base.providerExecuted = part.providerExecuted;
  } else {
    base.type = 'dynamic-tool' as const;
    base.toolName = toolName;
  }

  return base as UIMessage['parts'][0];
}

/**
 * Merges tool result into the corresponding assistant UI message
 */
function mergeToolResultIntoUIMessage(
  toolResult: ToolResultPart,
  uiMessages: Array<Omit<UIMessage, 'id'>>,
): boolean {
  for (let j = uiMessages.length - 1; j >= 0; j--) {
    const prev = uiMessages[j];
    if (prev.role === 'assistant') {
      const toolCallPart = prev.parts.find(
        (part) =>
          (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) &&
          (part as any).toolCallId === toolResult.toolCallId,
      );
      if (toolCallPart) {
        (toolCallPart as any).state = 'output-available';
        const raw = (toolResult as any).output ?? (toolResult as any).result;
        const normalized =
          raw != null && typeof raw === 'object' && 'value' in raw
            ? raw.value
            : raw;
        (toolCallPart as any).output = normalized;
        return true;
      }
    }
  }
  return false;
}
