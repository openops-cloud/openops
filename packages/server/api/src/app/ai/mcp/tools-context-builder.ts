import { wrapToolsWithApproval } from '@/mcp/tool-approval-wrapper';
import { AiConfigParsed, ChatFlowContext } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { MCPChatContext, saveChatTools } from '../chat/ai-chat.service';
import { generateMessageId } from '../chat/ai-id-generators';
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../chat/prompts.service';
import { sendReasoningToStream } from '../chat/stream-message-builder';
import { routeQuery } from './llm-query-router';
import { formatFrontendTools } from './tool-utils';
import { startMCPTools } from './tools-initializer';
import { AssistantUITools } from './types';

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
  userId: string;
  chatId: string;
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
      userId,
      chatId,
      projectId,
    });

    if (reasoning && stream) {
      const messageId = generateMessageId();
      sendReasoningToStream(stream, reasoning, messageId);
    }

    const systemPrompt = await getMcpSystemPrompt({
      queryClassification,
      selectedTools: filteredTools ?? {},
      allTools: tools,
      uiContext: additionalContext,
    });

    await saveChatTools(chatId, userId, projectId, selectedToolNames);

    const finalCombinedTools = Object.fromEntries(
      Object.entries(tools).filter(([name]) =>
        selectedToolNames.includes(name),
      ),
    );

    const toolsToUse = stream
      ? wrapToolsWithApproval(finalCombinedTools, () => ({
          userId,
          projectId,
          chatId,
          stream,
        }))
      : finalCombinedTools;

    return {
      mcpClients,
      systemPrompt,
      filteredTools: {
        ...toolsToUse,
        ...formatFrontendTools(frontendTools),
      },
    };
  }

  return {
    mcpClients: [],
    systemPrompt: await getBlockSystemPrompt(chatContext),
  };
}
