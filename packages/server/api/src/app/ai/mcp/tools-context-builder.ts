import { wrapToolsWithApproval } from '@/mcp/tool-approval-wrapper';
import { logger } from '@openops/server-shared';
import { AiConfigParsed, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import {
  getChatTools,
  MCPChatContext,
  saveChatTools,
} from '../chat/ai-chat.service';
import { generateMessageId } from '../chat/ai-id-generators';
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../chat/prompts.service';
import { sendReasoningToStream } from '../chat/stream-message-builder';
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
  aiConfig: AiConfigParsed;
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

    // Fetch previous tool names from Redis (append-only approach)
    const previousToolNames =
      userId && chatId ? await getChatTools(chatId, userId, projectId) : [];

    logger.info('[TOOL DEBUG] Previous tools from Redis', {
      previousToolNames,
    });
    logger.info('[TOOL DEBUG] All available tools', {
      allTools: Object.keys(tools),
    });

    const {
      tools: filteredTools,
      queryClassification,
      reasoning,
      selectedToolNames,
    } = await routeQuery({
      messages,
      tools,
      languageModel,
      aiConfig,
      uiContext: additionalContext,
      abortSignal,
      previousToolNames,
    });

    logger.info('[TOOL DEBUG] Selected tools after merge', {
      selectedToolNames,
    });
    logger.info('[TOOL DEBUG] Filtered tools keys', {
      filteredToolsKeys: Object.keys(filteredTools ?? {}),
    });

    if (reasoning && stream) {
      const messageId = generateMessageId();
      sendReasoningToStream(stream, reasoning, messageId);
    }

    const systemPrompt = await getMcpSystemPrompt({
      queryClassification,
      selectedTools: filteredTools,
      allTools: tools,
      uiContext: additionalContext,
    });

    // Apply append-only logic for OpenOps tools as well
    const allOpenOpsTools =
      hasToolProvider(tools, 'openops') &&
      queryClassification.includes(QueryClassification.openops)
        ? collectToolsByProvider(tools, 'openops')
        : {};

    // Only include OpenOps tools that are either:
    // 1. In the filtered tools from the query router (selectedToolNames)
    // 2. Were in the previous tools list (previousToolNames)
    const openOpsToolNames = Object.keys(allOpenOpsTools);
    const allowedOpenOpsToolNames = openOpsToolNames.filter(
      (toolName) =>
        selectedToolNames.includes(toolName) ||
        previousToolNames.includes(toolName),
    );

    const openOpsTools = Object.fromEntries(
      Object.entries(allOpenOpsTools).filter(([name]) =>
        allowedOpenOpsToolNames.includes(name),
      ),
    );

    const combinedTools = {
      ...filteredTools,
      ...openOpsTools,
    };

    // Get the final tool names including filtered openOpsTools for append-only tracking
    const finalToolNames = Object.keys(combinedTools);

    logger.info('[TOOL DEBUG] Combined tools after adding openOpsTools', {
      totalOpenOpsTools: openOpsToolNames.length,
      allowedOpenOpsToolNames,
      finalToolNames,
    });

    // Save the combined tool names (including openOpsTools) back to Redis
    if (userId && chatId) {
      await saveChatTools(chatId, userId, projectId, finalToolNames);
    }

    const finalTools =
      userId && chatId && stream
        ? wrapToolsWithApproval(combinedTools, () => ({
            userId,
            projectId,
            chatId,
            stream,
          }))
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
