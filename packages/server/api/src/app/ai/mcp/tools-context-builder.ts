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
import {
  beforeToolRouting,
  enhanceSystemPrompt,
  getAdditionalTools,
  processTools,
} from './extensions';
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
    const context = { userId, chatId, projectId };

    // Extension point: run any setup logic before routing
    await beforeToolRouting({ messages, context });

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

    const baseSystemPrompt = await getMcpSystemPrompt({
      queryClassification,
      selectedTools: filteredTools ?? {},
      allTools: tools,
      uiContext: additionalContext,
    });

    const hasTools = !!filteredTools && Object.keys(filteredTools).length > 0;
    const systemPrompt = await enhanceSystemPrompt({
      basePrompt: baseSystemPrompt,
      queryClassification,
      hasTools,
      context,
    });

    const finalCombinedTools = Object.fromEntries(
      Object.entries(tools).filter(([name]) =>
        selectedToolNames.includes(name),
      ),
    );

    const additionalTools = await getAdditionalTools({
      queryClassification,
      tools,
      languageModel,
      context,
    });

    const combinedTools = {
      ...finalCombinedTools,
      ...additionalTools,
    };

    const { tools: processedTools } = await processTools({
      tools: combinedTools,
      selectedToolNames: [
        ...selectedToolNames,
        ...Object.keys(additionalTools),
      ],
      queryClassification,
      context,
    });

    const toolsWithApproval = stream
      ? wrapToolsWithApproval(processedTools, () => ({
          userId,
          projectId,
          chatId,
          stream,
        }))
      : processedTools;

    const toolsToUse = {
      ...toolsWithApproval,
      ...formatFrontendTools(frontendTools),
    };

    await saveChatTools(chatId, userId, projectId, Object.keys(toolsToUse));

    return {
      mcpClients,
      systemPrompt,
      filteredTools: toolsToUse,
    };
  }

  return {
    mcpClients: [],
    systemPrompt: await getBlockSystemPrompt(chatContext),
  };
}
