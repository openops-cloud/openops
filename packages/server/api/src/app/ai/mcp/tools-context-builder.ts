import { wrapToolsWithApproval } from '@/mcp/tool-approval-wrapper';
import { AiConfig, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
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
  messages: ModelMessage[];
  chatContext: MCPChatContext;
  languageModel: LanguageModel;
  frontendTools: AssistantUITools;
  additionalContext?: ChatFlowContext;
  userId?: string;
  chatId?: string;
  stream?: NodeJS.WritableStream;
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
  additionalContext,
  userId,
  chatId,
  stream,
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
      uiContext: additionalContext,
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
      uiContext: additionalContext,
    });

    if (!filteredTools || Object.keys(filteredTools).length === 0) {
      systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
    }

    const openOpsTools = isOpenOpsMCPEnabled
      ? collectToolsByProvider(tools, 'openops')
      : {};

    const combinedTools = {
      ...filteredTools,
      ...openOpsTools,
    };

    const finalTools =
      userId && chatId && stream
        ? wrapToolsWithApproval(combinedTools, (_toolName: string) => ({
            userId,
            projectId,
            chatId,
            stream,
          }))
        : combinedTools;

    return {
      mcpClients,
      systemPrompt,
      filteredTools: finalTools,
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
