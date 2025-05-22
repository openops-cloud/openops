import { logger } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { CoreMessage, generateObject, LanguageModel, ToolSet } from 'ai';
import { z } from 'zod';

const MAX_SELECTED_TOOLS = 128;

const getSystemPrompt = (
  toolList: Array<{ name: string; description: string }>,
): string => {
  const toolsMessage = toolList
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');
  return `Given the following conversation history and the list of available tools, select the tools that are most relevant to answer the user's request. Return an array of tool names.\n\nTools:\n${toolsMessage}.`;
};

export async function selectRelevantTools({
  messages,
  tools,
  languageModel,
  aiConfig,
}: {
  messages: CoreMessage[];
  tools: ToolSet;
  languageModel: LanguageModel;
  aiConfig: AiConfig;
}): Promise<ToolSet | undefined> {
  if (!tools || Object.keys(tools).length === 0) {
    return undefined;
  }

  const toolList = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description || '',
  }));

  try {
    const { object: toolSelectionResult } = await generateObject({
      model: languageModel,
      schema: z.object({
        tool_names: z.array(z.string()),
      }),
      system: getSystemPrompt(toolList),
      messages,
      ...aiConfig.modelSettings,
    });

    let selectedToolNames = toolSelectionResult.tool_names;

    const validToolNames = Object.keys(tools);
    const invalidToolNames = selectedToolNames.filter(
      (name) => !validToolNames.includes(name),
    );

    if (invalidToolNames.length > 0) {
      selectedToolNames = selectedToolNames.filter((name) =>
        validToolNames.includes(name),
      );
    }

    return Object.fromEntries(
      Object.entries(tools)
        .filter(([name]) => selectedToolNames.includes(name))
        .slice(0, MAX_SELECTED_TOOLS),
    );
  } catch (error) {
    logger.error('Error selecting tools', error);
    return;
  }
}
