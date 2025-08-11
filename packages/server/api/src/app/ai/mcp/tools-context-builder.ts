import { AiConfig } from '@openops/shared';
import { CoreMessage, LanguageModelV1, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { MCPChatContext } from '../chat/ai-chat.service';
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../chat/prompts.service';
import { formatFrontendTools } from './tool-utils';
import { startMCPTools } from './tools-initializer';
import { selectRelevantTools } from './tools-selector';
import { AssistantUITools } from './types';

type MCPToolsContextParams = {
  app: FastifyInstance;
  projectId: string;
  authToken: string;
  aiConfig: AiConfig;
  messages: CoreMessage[];
  chatContext: MCPChatContext;
  languageModel: LanguageModelV1;
  frontendTools: AssistantUITools;
};

export type MCPToolsContext = {
  mcpClients: unknown[];
  systemPrompt: string;
  filteredTools?: ToolSet;
};

export async function getMCPToolsContext({
  app,
  projectId,
  authToken,
  aiConfig,
  messages,
  chatContext,
  languageModel,
  frontendTools,
}: MCPToolsContextParams): Promise<MCPToolsContext> {
  if (
    !chatContext.actionName ||
    !chatContext.blockName ||
    !chatContext.stepId ||
    !chatContext.workflowId
  ) {
    const { mcpClients, tools } = await startMCPTools(
      app,
      authToken,
      projectId,
    );

    const allTools = {
      ...tools,
      ...formatFrontendTools(frontendTools),
    };

    const filteredTools = await selectRelevantTools({
      messages,
      tools: allTools,
      languageModel,
      aiConfig,
    });

    const isAwsCostMcpDisabled =
      !hasToolProvider(tools, 'aws-pricing') &&
      !hasToolProvider(tools, 'cost-explorer');

    const isAnalyticsLoaded = hasToolProvider(filteredTools, 'superset');
    const isTablesLoaded = hasToolProvider(filteredTools, 'tables');
    const isOpenOpsMCPEnabled = hasToolProvider(filteredTools, 'openops');

    let systemPrompt = await getMcpSystemPrompt({
      isAnalyticsLoaded,
      isTablesLoaded,
      isOpenOpsMCPEnabled,
      isAwsCostMcpDisabled,
    });

    if (!filteredTools || Object.keys(filteredTools).length === 0) {
      systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
    }

    return {
      mcpClients,
      systemPrompt,
      filteredTools: {
        ...filteredTools,
        ...(isOpenOpsMCPEnabled
          ? collectToolsByProvider(tools, 'openops')
          : {}),
      },
    };
  }

  return {
    mcpClients: [],
    systemPrompt: await getBlockSystemPrompt(chatContext),
  };
}

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
