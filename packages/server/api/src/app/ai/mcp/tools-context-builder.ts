import { wrapToolsWithApproval } from '@/mcp/tool-approval-wrapper';
import { AiConfig, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { MCPChatContext } from '../chat/ai-chat.service';
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../chat/prompts.service';
import { routeQuery } from './llm-query-router';
import {
  collectToolsByProvider,
  formatFrontendTools,
  hasToolProvider,
} from './tool-utils';
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
  userId?: string;
  chatId?: string;
  stream?: NodeJS.WritableStream;
  abortSignal?: AbortSignal;
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
  abortSignal,
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
      abortSignal,
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

    const openOpsTools =
      hasToolProvider(tools, 'openops') &&
      queryClassification.includes(QueryClassification.openops)
        ? collectToolsByProvider(tools, 'openops')
        : {};

    const combinedTools = {
      ...filteredTools,
      ...openOpsTools,
    };

    const finalTools =
      userId && chatId && stream
        ? wrapToolsWithApproval(
            combinedTools,
            () => ({
              userId,
              projectId,
              chatId,
              stream,
            }),
            app.io,
          )
        : combinedTools;

    return {
      mcpClients,
      systemPrompt,
      filteredTools: {
        ...finalTools,
        ...formatFrontendTools(frontendTools),
      },
    };
  }

  return {
    mcpClients: [],
    systemPrompt: await getBlockSystemPrompt(chatContext),
  };
}
