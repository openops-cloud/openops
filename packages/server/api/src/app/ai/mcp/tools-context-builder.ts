import { AiConfig, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { MCPChatContext } from '../chat/ai-chat.service';
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../chat/prompts.service';
import { routeQuery } from './llm-query-router';
import { formatFrontendTools } from './tool-utils';
import { startMCPTools } from './tools-initializer';
import { AssistantUITools, QueryClassification } from './types';

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

    const { tools: filteredTools, queryClassification } = await routeQuery({
      messages,
      tools,
      languageModel,
      aiConfig,
      uiContext: additionalContext,
    });

    let systemPrompt = await getMcpSystemPrompt({
      queryClassification,
      selectedTools: filteredTools,
      allTools: tools,
      uiContext: additionalContext,
    });

    if (!filteredTools || Object.keys(filteredTools).length === 0) {
      systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
    }

    return {
      mcpClients,
      systemPrompt,
      filteredTools: {
        ...filteredTools,
        ...(queryClassification.includes(QueryClassification.openops)
          ? collectToolsByProvider(tools, QueryClassification.openops)
          : {}),
        ...formatFrontendTools(frontendTools),
      },
    };
  }

  return {
    mcpClients: [],
    systemPrompt: await getBlockSystemPrompt(chatContext),
  };
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
