import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  generateObject,
  LanguageModel,
  LanguageModelV1,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getMCPTools } from '../mcp/mcp-tools';
import { getMcpSystemPrompt } from './prompts.service';

const MAX_SELECTED_TOOLS = 128;

export type MCPToolsContext = {
  mcpClients: unknown[];
  systemPrompt: string;
  filteredTools?: ToolSet;
};

export async function getMCPToolsContext(
  app: FastifyInstance,
  projectId: string,
  authToken: string,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  languageModel: LanguageModelV1,
): Promise<MCPToolsContext> {
  const { mcpClients, tools } = await getMCPTools(app, authToken, projectId);

  const filteredTools = await selectRelevantTools({
    messages,
    tools,
    languageModel,
    aiConfig,
  });

  const isAnalyticsLoaded = hasToolProvider(filteredTools, 'superset');
  const isTablesLoaded = hasToolProvider(filteredTools, 'tables');
  const isOpenOpsMCPEnabled = hasToolProvider(filteredTools, 'openops');

  let systemPrompt = await getMcpSystemPrompt({
    isAnalyticsLoaded,
    isTablesLoaded,
    isOpenOpsMCPEnabled,
  });

  if (!filteredTools || Object.keys(filteredTools).length === 0) {
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  return {
    mcpClients,
    systemPrompt,
    filteredTools: {
      ...filteredTools,
      ...(isOpenOpsMCPEnabled ? collectToolsByProvider(tools, 'openops') : {}),
    },
  };
}

async function selectRelevantTools({
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
}

const getSystemPrompt = (
  toolList: Array<{ name: string; description: string }>,
): string => {
  const toolsMessage = toolList
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');
  return `Given the following conversation history and the list of available tools, select the tools that are most relevant to answer the user's request. Return an array of tool names.\n\nTools:\n${toolsMessage}.`;
};

function hasToolProvider(
  tools: ToolSet | undefined,
  provider: string,
): boolean {
  return Object.values(tools ?? {}).some(
    (tool) => (tool as { toolProvider?: string }).toolProvider === provider,
  );
}

function collectToolsByProvider(
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
