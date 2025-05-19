import { logger } from '@openops/server-shared';
import { CoreMessage, generateObject, LanguageModel, ToolSet } from 'ai';
import { z } from 'zod';

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
}: {
  messages: CoreMessage[];
  tools: ToolSet;
  languageModel: LanguageModel;
}): Promise<ToolSet | undefined> {
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
    });

    const selectedToolNames = toolSelectionResult.tool_names;
    const filteredTools = Object.fromEntries(
      Object.entries(tools).filter(([name]) =>
        selectedToolNames.includes(name),
      ),
    );

    return filteredTools;
  } catch (error) {
    logger.error(error, 'Error selecting tools:');
    return;
  }
}
