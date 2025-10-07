import { ModelMessage, ToolSet } from 'ai';

const providerOptionsWithCache = {
  anthropic: { cacheControl: { type: 'ephemeral' } },
};

/**
 * Adds cache control to messages following a three-breakpoint strategy:
 * 1. Always cache system prompt (breakpoint 1)
 * 2. Always cache all tools by setting cache on last tool (breakpoint 2)
 * 3. Always cache last user message (breakpoint 3)
 *
 * @param messages - Array of messages in the conversation
 * @param systemPrompt - System prompt to prepend as a cached message
 * @returns Modified messages with cache control added
 */
export function addCacheControlToMessages(
  messages: ModelMessage[],
  systemPrompt: string,
): ModelMessage[] {
  // Prepend system prompt as a cached system message (breakpoint 1)
  const systemMessage: ModelMessage = {
    role: 'system',
    content: systemPrompt,
    providerOptions: providerOptionsWithCache,
  };

  let lastUserMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserMessageIndex = i;
      break;
    }
  }

  // Add cache control to last user message (breakpoint 3)
  const cachedMessages = messages.map((msg, index) => {
    if (index === lastUserMessageIndex) {
      return {
        ...msg,
        providerOptions: providerOptionsWithCache,
      };
    }
    return msg;
  });

  return [systemMessage, ...cachedMessages];
}

/**
 * Adds cache control to tools by setting it only on the LAST tool.
 * Since Anthropic caches everything up to and including a cache breakpoint,
 * this caches all tools while using only 1 breakpoint (breakpoint 2).
 *
 * @param tools - Tools to add cache control to
 * @returns Tools with cache control added to the last tool only
 */
export function addCacheControlToTools(tools?: ToolSet): ToolSet | undefined {
  if (!tools) {
    return undefined;
  }

  const toolEntries = Object.entries(tools);
  if (toolEntries.length === 0) {
    return tools;
  }

  const lastIndex = toolEntries.length - 1;

  return toolEntries.reduce((acc, [key, toolDef], index) => {
    acc[key] =
      index === lastIndex
        ? { ...toolDef, providerOptions: providerOptionsWithCache }
        : toolDef;
    return acc;
  }, {} as ToolSet);
}
