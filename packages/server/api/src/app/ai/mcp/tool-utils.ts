import { jsonSchema } from '@ai-sdk/ui-utils';
import {
  AssistantContent,
  CoreMessage,
  CoreToolMessage,
  TextPart,
  ToolCallPart,
  ToolResult,
  ToolSet,
} from 'ai';
import { AssistantUITools } from './types';

// format tools from assistant-ui to AI SDK ToolSet
export const formatFrontendTools = (tools: AssistantUITools): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: jsonSchema(tool.parameters),
      },
    ]),
  );

/**
 * Adds separate tool messages for UI tool calls (tools with names starting with 'ui-')
 * This ensures frontend tools have results in chat history for proper conversation flow
 * In the future, we should refactor to make the FE save the real results to the chat history
 */
export function addUiToolResults(messages: CoreMessage[]): CoreMessage[] {
  const newMessages: CoreMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const uiToolCalls = msg.content.filter(isUiToolCall);

      if (uiToolCalls.length > 0) {
        const assistantContent = msg.content.map((part) => {
          if (isUiToolCall(part) && isToolCallWithResult(part)) {
            const { result: _result, ...cleanToolCall } = part;
            return cleanToolCall;
          }
          return part;
        });

        newMessages.push({
          ...msg,
          content: assistantContent,
        });

        for (const toolCall of uiToolCalls) {
          const toolMessage: CoreToolMessage = {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: 'Finished running tool',
                    },
                  ],
                  isError: false,
                },
              },
            ],
          };
          newMessages.push(toolMessage);
        }
      } else {
        // No UI tool calls, keep the message as is
        newMessages.push(msg);
      }
    } else {
      // Not an assistant message or not an array content, keep as is
      newMessages.push(msg);
    }
  }

  return newMessages;
}

function isToolCallPart(part: AssistantContent[number]): part is ToolCallPart {
  return !!part && typeof part === 'object' && part.type === 'tool-call';
}

// opinionated type guard for UI tool calls
function isUiToolCall(part: AssistantContent[number]): part is ToolCallPart {
  return isToolCallPart(part) && part.toolName?.startsWith('ui-');
}

function isToolCallWithResult(
  part: TextPart | ToolCallPart,
): part is ToolCallPart & { result: ToolResult<string, unknown, unknown> } {
  return isToolCallPart(part) && 'result' in part;
}
