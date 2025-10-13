import { ModelMessage, ToolSet } from 'ai';

const providerOptionsWithCache = {
  anthropic: { cacheControl: { type: 'ephemeral' } },
};

/**
 * Adds cache control to messages with the following breakpoint strategy:
 * - Always cache last user message (breakpoint 2)
 *
 * @param messages - Array of messages in the conversation
 * @returns Modified messages with cache control added
 */
export function addCacheControlToMessages(
  messages: ModelMessage[],
): ModelMessage[] {
  let lastUserMessageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserMessageIndex = i;
      break;
    }
  }

  const cachedMessages = messages.map((msg, index) => {
    if (index === lastUserMessageIndex) {
      return {
        ...msg,
        providerOptions: providerOptionsWithCache,
      };
    }
    return msg;
  });

  return cachedMessages;
}

/**
 * Adds cache control to tools by setting it only on the LAST tool.
 * Since Anthropic caches everything up to and including a cache breakpoint,
 * this caches all tools while using only 1 breakpoint (breakpoint 1).
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
