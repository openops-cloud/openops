import { AIChatMessage, ToolResult, UI_TOOL_PREFIX } from '@openops/shared';
import {
  AssistantContent,
  jsonSchema,
  ModelMessage,
  StepResult,
  ToolCallPart,
  ToolSet,
} from 'ai';
import { AssistantUITools } from './types';

export type FrontendToolResultsMap = Map<string, ToolResult>;

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
 * Creates a map of tool results indexed by toolCallId for efficient lookup.
 */
export function createToolResultsMap(
  toolResults?: ToolResult[],
): FrontendToolResultsMap {
  const map = new Map<string, ToolResult>();
  if (toolResults) {
    for (const result of toolResults) {
      map.set(result.toolCallId, result);
    }
  }
  return map;
}

function isToolCallPart(part: AssistantContent[number]): part is ToolCallPart {
  return !!part && typeof part === 'object' && part.type === 'tool-call';
}

// opinionated type guard for UI tool calls
function isUiToolCall(part: AssistantContent[number]): part is ToolCallPart {
  return isToolCallPart(part) && part.toolName?.startsWith(UI_TOOL_PREFIX);
}

/**
 * Collects all existing tool result IDs from tool messages in the chat history.
 */
function collectExistingToolResultIds(
  chatHistory: ModelMessage[],
): Set<string> {
  const ids = new Set<string>();
  for (const msg of chatHistory) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result' && 'toolCallId' in part) {
          ids.add(part.toolCallId);
        }
      }
    }
  }
  return ids;
}

/**
 * Creates a tool result message from a tool call and its result.
 */
function createToolResultMessage(
  toolCall: ToolCallPart,
  result: ToolResult,
): ModelMessage {
  const outputValue = result.output;
  const output = {
    type: 'text' as const,
    value:
      typeof outputValue === 'string'
        ? outputValue
        : JSON.stringify(outputValue),
  };

  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        output,
      },
    ],
  };
}

/**
 * Finds UI tool calls missing results and creates tool result messages for them.
 */
function findMissingUiToolResultMessages(
  chatHistory: ModelMessage[],
  frontendToolResults: FrontendToolResultsMap,
  existingToolResultIds: Set<string>,
): ModelMessage[] {
  const missingMessages: ModelMessage[] = [];

  for (const msg of chatHistory) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) {
      continue;
    }

    for (const toolCall of msg.content.filter(isUiToolCall)) {
      if (existingToolResultIds.has(toolCall.toolCallId)) {
        continue;
      }

      const actualResult = frontendToolResults.get(toolCall.toolCallId);
      if (!actualResult) {
        continue;
      }

      missingMessages.push(createToolResultMessage(toolCall, actualResult));
      existingToolResultIds.add(toolCall.toolCallId);
    }
  }

  return missingMessages;
}

/**
 * Adds missing tool-result messages for UI tool calls in chat history.
 * Scans history for assistant messages with UI tool calls that don't have
 * corresponding tool-result messages, and adds them using the provided frontend results.
 *
 * @param chatHistory - The existing chat history to process
 * @param frontendToolResults - Map of actual tool results from the frontend
 * @returns Updated chat history with missing tool-results added
 */
export function addMissingUiToolResults(
  chatHistory: ModelMessage[],
  frontendToolResults: FrontendToolResultsMap,
): ModelMessage[] {
  if (frontendToolResults.size === 0) {
    return chatHistory;
  }

  const existingIds = collectExistingToolResultIds(chatHistory);
  const missingMessages = findMissingUiToolResultMessages(
    chatHistory,
    frontendToolResults,
    existingIds,
  );

  if (missingMessages.length === 0) {
    return chatHistory;
  }

  return [...chatHistory, ...missingMessages];
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

const UI_TOOL_TYPE_PREFIX = 'tool-ui-';

type MessagePart = {
  type?: string;
  state?: string;
  toolCallId?: string;
  output?: unknown;
};

function isUiToolResultPart(part: MessagePart): boolean {
  return (
    typeof part.type === 'string' &&
    part.type.startsWith(UI_TOOL_TYPE_PREFIX) &&
    part.state === 'output-available' &&
    !!part.toolCallId &&
    part.output !== undefined
  );
}

export function extractUiToolResultsFromMessage(
  message: AIChatMessage,
): ToolResult[] {
  if (typeof message === 'string') {
    return [];
  }

  const results: ToolResult[] = [];

  for (const part of message.parts as MessagePart[]) {
    if (isUiToolResultPart(part) && part.toolCallId && part.type) {
      results.push({
        toolCallId: part.toolCallId,
        // 'tool-ui-navigate' -> 'ui-navigate'
        toolName: part.type.replace('tool-', ''),
        output: part.output,
      });
    }
  }

  return results;
}
