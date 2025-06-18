import { logger } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { CoreMessage, LanguageModelV1, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import {
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
  saveChatHistoryContext,
} from './ai-chat.service';
import { generateMessageId } from './ai-message-id-generator';
import { streamAIResponse } from './ai-stream-handler';
import { getMCPToolsContext, MCPToolsContext } from './tools.service';

type RequestContext = {
  userId: string;
  chatId: string;
  projectId: string;
  serverResponse: NodeJS.WritableStream;
};

type ModelConfig = {
  aiConfig: AiConfig;
  languageModel: LanguageModelV1;
};

type UserMessageParams = RequestContext &
  ModelConfig & {
    authToken: string;
    app: FastifyInstance;
    newMessage: CoreMessage;
  };

type StreamCallSettings = RequestContext &
  ModelConfig & {
    tools?: ToolSet;
    systemPrompt: string;
    chatContext: ChatCurrentContext;
  };

type ChatCurrentContext = {
  newMessage: CoreMessage;
  chatHistory: CoreMessage[];
};

export async function handleUserMessage(
  params: UserMessageParams,
): Promise<void> {
  const {
    app,
    chatId,
    userId,
    aiConfig,
    projectId,
    authToken,
    newMessage,
    languageModel,
    serverResponse,
  } = params;

  serverResponse.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  const chatCurrentContext: ChatCurrentContext = {
    newMessage,
    chatHistory: await appendMessagesToChatHistoryContext(chatId, [newMessage]),
  };

  const { mcpClients, filteredTools, systemPrompt } =
    await getMCPToolsContextWithRetry(
      app,
      projectId,
      authToken,
      aiConfig,
      languageModel,
      chatCurrentContext,
    );

  sendAiChatMessageSendEvent({
    projectId,
    userId,
    chatId,
    provider: aiConfig.provider,
  });

  try {
    const newMessages = await streamAiResponseWithRetry({
      userId,
      chatId,
      projectId,
      aiConfig,
      systemPrompt,
      languageModel,
      serverResponse,
      tools: filteredTools,
      chatContext: chatCurrentContext,
    });

    await appendMessagesToChatHistory(chatId, [newMessage, ...newMessages]);
    await saveChatHistoryContext(chatId, [
      ...chatCurrentContext.chatHistory,
      ...newMessages,
    ]);
  } finally {
    await closeMCPClients(mcpClients);
    serverResponse.write(`d:{"finishReason":"stop"}\n`);
    serverResponse.end();
  }
}

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  try {
    for (const mcpClient of mcpClients) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mcpClient as any)?.close();
    }
  } catch (error) {
    logger.warn('Failed to close mcp client.', error);
  }
}

async function streamAiResponseWithRetry(
  params: StreamCallSettings,
): Promise<CoreMessage[]> {
  const { chatContext } = params;
  const newMessages: CoreMessage[] = [];

  try {
    await streamAIResponse({
      ...params,
      newMessages,
      chatHistory: chatContext.chatHistory,
    });
  } catch (error) {
    unrecoverableError(params, error);
  }

  return newMessages;
}

function unrecoverableError(
  streamParams: StreamCallSettings,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  streamParams.serverResponse.write(`0:${JSON.stringify(errorMessage)}\n`);
  logger.warn(errorMessage, error);

  sendAiChatFailureEvent({
    projectId: streamParams.projectId,
    userId: streamParams.userId,
    chatId: streamParams.chatId,
    errorMessage,
    provider: streamParams.aiConfig.provider,
    model: streamParams.aiConfig.model,
  });
}

async function getMCPToolsContextWithRetry(
  app: FastifyInstance,
  projectId: string,
  authToken: string,
  aiConfig: AiConfig,
  languageModel: LanguageModelV1,
  chatCurrentContext: ChatCurrentContext,
): Promise<MCPToolsContext> {
  try {
    return await getMCPToolsContext(
      app,
      projectId,
      authToken,
      aiConfig,
      chatCurrentContext.chatHistory,
      languageModel,
    );
  } catch (error) {
    logger.error('Error selecting tools', error);
  }

  return {
    mcpClients: [],
    systemPrompt: '',
  };
}
