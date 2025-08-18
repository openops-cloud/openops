import {
  AssistantContent,
  jsonSchema,
  ModelMessage,
  ToolCallPart,
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
        inputSchema: jsonSchema(tool.parameters),
      },
    ]),
  );

const UI_TOOL_PREFIX = 'ui-';
const UI_TOOL_RESULT_MESSAGE = 'Finished running tool';

/**
 * Adds separate tool messages for UI tool calls (tools with names starting with 'ui-')
 * This ensures frontend tools have results in chat history for proper conversation flow
 * In the future, we should refactor to make the FE save the real results to the chat history
 */
export function addUiToolResults(messages: ModelMessage[]): ModelMessage[] {
  const newMessages: ModelMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const uiToolCalls = msg.content.filter(isUiToolCall);

      if (uiToolCalls.length > 0) {
        // In AI SDK v5, tool calls don't have embedded results, so we don't need to clean them
        newMessages.push(msg);

        for (const toolCall of uiToolCalls) {
          const toolMessage: ModelMessage = {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                output: {
                  type: 'text',
                  value: UI_TOOL_RESULT_MESSAGE,
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
  return isToolCallPart(part) && part.toolName?.startsWith(UI_TOOL_PREFIX);
}
