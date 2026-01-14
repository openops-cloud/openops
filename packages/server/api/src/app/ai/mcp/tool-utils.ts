import {
  AssistantContent,
  jsonSchema,
  ModelMessage,
  StepResult,
  ToolCallPart,
  ToolSet,
} from 'ai';
import { AssistantUITools } from './types';

export const UI_TOOL_PREFIX = 'ui-';
const UI_TOOL_RESULT_MESSAGE = 'Finished running tool';

/**
 * Creates a predicate function that checks whether the last step in a sequence
 * of tool steps contains a tool call whose name matches the provided criteria.
 *
 * @param match - A predicate function that receives a tool name and returns
 *   true if it matches the desired condition.
 * @returns A predicate function that takes an event object containing a
 *   `steps` array and returns true if the last step includes at least one
 *   tool call whose name satisfies the `match` condition; otherwise false.
 */
export function hasToolCall(
  match: (toolName: string) => boolean,
): (event: { steps: StepResult<ToolSet>[] }) => boolean {
  return ({ steps }) => {
    const lastStep = steps.at(-1);
    return (
      lastStep?.toolCalls?.some((toolCall) => match(toolCall.toolName)) ?? false
    );
  };
}

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

export function collectToolsByProvider(
  tools: ToolSet | undefined,
  provider: string,
): ToolSet {
  const result: ToolSet = {};
  for (const [key, tool] of Object.entries(tools ?? {})) {
    if ((tool as { toolProvider?: string }).toolProvider === provider) {
      result[key] = tool;
    }
  }
  return result;
}

export function hasToolProvider(
  tools: ToolSet | undefined,
  provider: string,
): boolean {
  return Object.values(tools ?? {}).some(
    (tool) => (tool as { toolProvider?: string }).toolProvider === provider,
  );
}

/*
  This function is used to sanitize the messages to ensure that the input is an object.
  It happens that a tool call could be hallucinated and the input is a string instead of an object.
  Anthropic API will throw an error and the conversation will be broken.
  Example error: messages.79.content.1.tool_use.input: Input should be a valid dictionary
  https://github.com/anthropics/claude-code/issues/6695
*/
export function sanitizeMessages(messages: ModelMessage[]): ModelMessage[] {
  const malformedInputError = {
    error: 'Malformed input. Input must be an object.',
  };
  return messages.map((message) => {
    if (!Array.isArray(message.content)) {
      return message;
    }

    const sanitizedContent = message.content.map((part) => {
      if (part.type === 'tool-call' && typeof part.input === 'string') {
        try {
          const parsedInput = JSON.parse(part.input);
          if (
            typeof parsedInput !== 'object' ||
            parsedInput === null ||
            Array.isArray(parsedInput)
          ) {
            return {
              ...part,
              input: malformedInputError,
            };
          }
          return {
            ...part,
            input: parsedInput,
          };
        } catch {
          return {
            ...part,
            input: malformedInputError,
          };
        }
      }

      return part;
    });

    return {
      ...message,
      content: sanitizedContent,
    } as ModelMessage;
  });
}
