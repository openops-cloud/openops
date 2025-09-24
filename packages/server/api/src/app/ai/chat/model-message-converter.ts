/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateId, ModelMessage, ToolSet, UIMessage } from 'ai';

/**
 * Converts a system message to UI message format
 */
function convertSystemMessage(message: ModelMessage): Omit<UIMessage, 'id'> {
  return {
    role: 'system',
    parts: [
      {
        type: 'text',
        text: message.content as string,
        state: 'done',
        ...(message.providerOptions != null
          ? { providerMetadata: message.providerOptions }
          : {}),
      },
    ],
  };
}

/**
 * Converts text content to UI part format
 */
function createTextPart(
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
 * Converts file content to UI part format
 */
function createFilePart(
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
 * Converts image content to UI part format
 */
function createImagePart(
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
 * Converts tool call content to UI part format
 */
function createToolCallPart(part: any, tools?: ToolSet): UIMessage['parts'][0] {
  const toolName = part.toolName;
  const tool = tools?.[toolName];
  const hasOutput = part.output != null;

  if (tool) {
    // Static tool
    return {
      type: `tool-${toolName}` as any,
      toolCallId: part.toolCallId,
      state: hasOutput
        ? ('output-available' as const)
        : ('input-available' as const),
      input: part.input as Record<string, unknown>,
      ...(hasOutput
        ? {
            output: part.output.value || part.output,
          }
        : {}),
      providerExecuted: part.providerExecuted,
      ...(part.providerOptions != null
        ? { callProviderMetadata: part.providerOptions }
        : {}),
    };
  } else {
    // Dynamic tool
    return {
      type: 'dynamic-tool' as const,
      toolName,
      toolCallId: part.toolCallId,
      state: hasOutput
        ? ('output-available' as const)
        : ('input-available' as const),
      input: part.input as Record<string, unknown>,
      ...(hasOutput
        ? {
            output: part.output.value || part.output,
          }
        : {}),
      ...(part.providerOptions != null
        ? { callProviderMetadata: part.providerOptions }
        : {}),
    };
  }
}

/**
 * Converts tool result content to UI part format
 */
function createToolResultPart(
  part: any,
  tools?: ToolSet,
): UIMessage['parts'][0] {
  const toolName = part.toolName;
  const tool = tools?.[toolName];

  if (tool) {
    // Static tool result
    return {
      type: `tool-${toolName}` as any,
      toolCallId: part.toolCallId,
      state: 'output-available' as const,
      input: {}, // Tool input is not available in tool result messages
      output: part.output,
      ...(part.providerOptions != null
        ? { callProviderMetadata: part.providerOptions }
        : {}),
    };
  } else {
    // Dynamic tool result
    return {
      type: 'dynamic-tool' as const,
      toolName,
      toolCallId: part.toolCallId,
      state: 'output-available' as const,
      input: {}, // Tool input is not available in tool result messages
      output: part.output,
      ...(part.providerOptions != null
        ? { callProviderMetadata: part.providerOptions }
        : {}),
    };
  }
}

/**
 * Converts user message content to UI parts
 */
function convertUserMessageContent(
  content: string | any[],
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPart(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPart(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePart(part, part.providerOptions));
          break;
        case 'image':
          parts.push(createImagePart(part, part.providerOptions));
          break;
        default:
          // Skip unsupported parts for user messages
          break;
      }
    }
  }

  return parts;
}

/**
 * Converts assistant message content to UI parts
 */
function convertAssistantMessageContent(
  content: string | any[],
  tools?: ToolSet,
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPart(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPart(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePart(part, part.providerOptions));
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
          parts.push(createToolCallPart(part, tools));
          break;
        case 'tool-result':
          // Tool results are handled separately in tool messages
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
 * Converts tool message content to UI parts
 */
function convertToolMessageContent(
  content: any[],
  tools?: ToolSet,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  for (const part of content) {
    if (part.type === 'tool-result') {
      parts.push(createToolResultPart(part, tools));
    }
  }

  return parts;
}

/**
 * Converts a single message to UI message format
 */
function convertMessage(
  message: ModelMessage,
  tools?: ToolSet,
): Omit<UIMessage, 'id'> | null {
  switch (message.role) {
    case 'system':
      return convertSystemMessage(message);

    case 'user':
      return {
        role: 'user',
        parts: convertUserMessageContent(
          message.content,
          message.providerOptions,
        ),
      };

    case 'assistant':
      return {
        role: 'assistant',
        parts: convertAssistantMessageContent(
          message.content,
          tools,
          message.providerOptions,
        ),
      };

    case 'tool': {
      const parts = convertToolMessageContent(message.content as any[], tools);
      if (parts.length > 0) {
        return {
          role: 'assistant',
          parts,
        };
      }
      return null;
    }

    default:
      throw new Error(`Unsupported role: ${(message as any).role}`);
  }
}
