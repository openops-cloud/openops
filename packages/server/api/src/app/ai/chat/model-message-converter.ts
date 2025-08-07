import { ModelMessage, ToolSet, UIMessage } from 'ai';

/**
 * Converts an array of ModelMessages to an array of UIMessages that can be used
 * with the UI components (e.g. `useChat`).
 *
 * This is the reverse operation of `convertToModelMessages`.
 *
 * @param messages - The ModelMessages to convert.
 * @param options.tools - The tools to use for tool call conversion.
 */
export function convertToUIMessages(
  messages: ModelMessage[],
  options?: {
    tools?: ToolSet;
  },
): Array<Omit<UIMessage, 'id'>> {
  const uiMessages: Array<Omit<UIMessage, 'id'>> = [];

  for (const message of messages) {
    switch (message.role) {
      case 'system': {
        uiMessages.push({
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
        });
        break;
      }

      case 'user': {
        const parts: unknown[] = [];

        if (typeof message.content === 'string') {
          parts.push({
            type: 'text',
            text: message.content,
            state: 'done',
            ...(message.providerOptions != null
              ? { providerMetadata: message.providerOptions }
              : {}),
          });
        } else if (Array.isArray(message.content)) {
          for (const part of message.content) {
            switch (part.type) {
              case 'text':
                parts.push({
                  type: 'text',
                  text: part.text,
                  state: 'done',
                  ...(part.providerOptions != null
                    ? { providerMetadata: part.providerOptions }
                    : {}),
                });
                break;

              case 'file':
                parts.push({
                  type: 'file',
                  mediaType: part.mediaType,
                  filename: part.filename,
                  url:
                    typeof part.data === 'string'
                      ? part.data
                      : part.data.toString(),
                  ...(part.providerOptions != null
                    ? { providerMetadata: part.providerOptions }
                    : {}),
                });
                break;

              case 'image':
                // Convert image to file part for UI
                parts.push({
                  type: 'file',
                  mediaType: part.mediaType ?? 'image/jpeg',
                  url:
                    typeof part.image === 'string'
                      ? part.image
                      : part.image.toString(),
                  ...(part.providerOptions != null
                    ? { providerMetadata: part.providerOptions }
                    : {}),
                });
                break;

              default:
                // Skip unsupported parts for user messages
                break;
            }
          }
        }

        uiMessages.push({
          role: 'user',
          parts: parts as UIMessage['parts'],
        });
        break;
      }

      case 'assistant': {
        const parts: unknown[] = [];

        if (typeof message.content === 'string') {
          parts.push({
            type: 'text',
            text: message.content,
            state: 'done',
            ...(message.providerOptions != null
              ? { providerMetadata: message.providerOptions }
              : {}),
          });
        } else if (Array.isArray(message.content)) {
          for (const part of message.content) {
            switch (part.type) {
              case 'text':
                parts.push({
                  type: 'text',
                  text: part.text,
                  state: 'done',
                  ...(part.providerOptions != null
                    ? { providerMetadata: part.providerOptions }
                    : {}),
                });
                break;

              case 'file':
                parts.push({
                  type: 'file',
                  mediaType: part.mediaType,
                  filename: part.filename,
                  url:
                    typeof part.data === 'string'
                      ? part.data
                      : part.data.toString(),
                  ...(part.providerOptions != null
                    ? { providerMetadata: part.providerOptions }
                    : {}),
                });
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

              case 'tool-call': {
                const toolName = part.toolName;
                const tool = options?.tools?.[toolName];

                // Check if this tool call has an output (tool result)
                const hasOutput = (part as any).output != null;

                if (tool) {
                  // Static tool
                  const toolUIPart = {
                    type: `tool-${toolName}` as any,
                    toolCallId: part.toolCallId,
                    state: hasOutput
                      ? ('output-available' as const)
                      : ('input-available' as const),
                    input: part.input as Record<string, unknown>,
                    ...(hasOutput
                      ? {
                          output:
                            (part as any).output.value || (part as any).output,
                        }
                      : {}),
                    providerExecuted: part.providerExecuted,
                    ...(part.providerOptions != null
                      ? { callProviderMetadata: part.providerOptions }
                      : {}),
                  };
                  parts.push(toolUIPart);
                } else {
                  // Dynamic tool
                  const dynamicToolUIPart = {
                    type: 'dynamic-tool' as const,
                    toolName,
                    toolCallId: part.toolCallId,
                    state: hasOutput
                      ? ('output-available' as const)
                      : ('input-available' as const),
                    input: part.input as Record<string, unknown>,
                    ...(hasOutput
                      ? {
                          output:
                            (part as any).output.value || (part as any).output,
                        }
                      : {}),
                    ...(part.providerOptions != null
                      ? { callProviderMetadata: part.providerOptions }
                      : {}),
                  };
                  parts.push(dynamicToolUIPart);
                }
                break;
              }

              case 'tool-result':
                // Tool results are handled separately in tool messages
                break;

              default:
                // Skip unsupported parts
                break;
            }
          }
        }

        uiMessages.push({
          role: 'assistant',
          parts: parts as UIMessage['parts'],
        });
        break;
      }

      case 'tool': {
        // Tool messages contain tool results that need to be associated with previous tool calls
        const parts: unknown[] = [];

        if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'tool-result') {
              const toolName = part.toolName;
              const tool = options?.tools?.[toolName];

              if (tool) {
                // Static tool result
                const toolUIPart = {
                  type: `tool-${toolName}` as any,
                  toolCallId: part.toolCallId,
                  state: 'output-available' as const,
                  input: {}, // Tool input is not available in tool result messages
                  output: part.output,
                  ...(part.providerOptions != null
                    ? { callProviderMetadata: part.providerOptions }
                    : {}),
                };
                parts.push(toolUIPart);
              } else {
                // Dynamic tool result
                const dynamicToolUIPart = {
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
                parts.push(dynamicToolUIPart);
              }
            }
          }
        }

        if (parts.length > 0) {
          uiMessages.push({
            role: 'assistant',
            parts: parts as UIMessage['parts'],
          });
        }
        break;
      }

      default: {
        throw new Error(`Unsupported role: ${(message as any).role}`);
      }
    }
  }

  return uiMessages;
}

/**
 * Converts a single ModelMessage to a UIMessage.
 *
 * @param message - The ModelMessage to convert.
 * @param options.tools - The tools to use for tool call conversion.
 */
export function convertToUIMessage(
  message: ModelMessage,
  options?: {
    tools?: ToolSet;
  },
): Omit<UIMessage, 'id'> {
  const messages = convertToUIMessages([message], options);
  return messages[0];
}
