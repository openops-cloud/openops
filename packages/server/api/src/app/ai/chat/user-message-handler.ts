/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AppSystemProp,
  getRedisConnection,
  logger,
  system,
} from '@openops/server-shared';
import { AiConfig, ChatFlowContext } from '@openops/shared';
import {
  AssistantModelMessage,
  convertToModelMessages,
  generateId,
  LanguageModel,
  ModelMessage,
  StreamTextResult,
  ToolModelMessage,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';
import { createResumableStreamContext } from 'resumable-stream/ioredis';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { addUiToolResults } from '../mcp/tool-utils';
import { getMCPToolsContext } from '../mcp/tools-context-builder';
import { AssistantUITools } from '../mcp/types';
import { saveChatHistory } from './ai-chat.service';
import { getLLMAsyncStream } from './llm-stream-handler';
import { extractMessage } from './message-extractor';
import { convertToUIMessages } from './model-message-converter';
import { ChatHistory, ChatProcessingContext, RequestContext } from './types';
import { createHeartbeatResponseWrapper } from './utils';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

type UserMessageParams = RequestContext &
  ChatProcessingContext & {
    authToken: string;
    app: FastifyInstance;
  } & {
    frontendTools: AssistantUITools;
    additionalContext?: ChatFlowContext;
    waitUntil: (p: Promise<unknown>) => void;
  };

type ModelConfig = {
  aiConfig: AiConfig;
  languageModel: LanguageModel;
};

type StreamCallSettings = RequestContext &
  ModelConfig & {
    tools?: ToolSet;
    systemPrompt: string;
    chatHistory: ChatHistory;
    mcpClients: unknown[];
  };

export async function handleUserMessage(
  params: UserMessageParams,
): Promise<Response> {
  const {
    app,
    chatId,
    userId,
    aiConfig,
    projectId,
    authToken,
    languageModel,
    serverResponse,
    conversation: { chatContext, chatHistory },
    frontendTools,
    additionalContext,
    waitUntil,
  } = params;

  const { mcpClients, systemPrompt, filteredTools } = await getMCPToolsContext({
    app,
    projectId,
    authToken,
    aiConfig,
    messages: chatHistory.messages,
    chatContext,
    languageModel,
    frontendTools,
    additionalContext,
    userId,
    chatId,
    stream: serverResponse,
  });

  // Clear any previous active stream and save the user message
  await saveChatHistory({
    chatId,
    userId,
    projectId,
    chatHistory: {
      ...chatHistory,
      activeStreamId: null,
    },
  });

  const streamTextResult = streamLLMResponse({
    userId,
    chatId,
    projectId,
    aiConfig,
    chatHistory,
    systemPrompt,
    languageModel,
    serverResponse,
    tools: filteredTools,
    mcpClients,
  });

  // const heartbeatWrapper = createHeartbeatResponseWrapper();

  const response = streamTextResult.toUIMessageStreamResponse({
    originalMessages: convertToUIMessages(chatHistory.messages),
    generateMessageId: generateId,
    onFinish: ({ messages }) => {
      // Clear the active stream when finished
      return saveChatHistory({
        chatId,
        userId,
        projectId,
        chatHistory: {
          messages: convertToModelMessages(messages),
          activeStreamId: null,
        },
      });
    },
    async consumeSseStream({ stream }) {
      const streamId = generateId();

      // Create a resumable stream from the SSE stream using separate Redis connections
      const redisConnection = getRedisConnection();
      const subscriberConnection = redisConnection.duplicate();
      const publisherConnection = redisConnection.duplicate();
      const streamContext = createResumableStreamContext({
        waitUntil,
        subscriber: subscriberConnection,
        publisher: publisherConnection,
      });

      await streamContext.createNewResumableStream(streamId, () => stream);

      // Update the chat with the active stream ID
      await saveChatHistory({
        chatId,
        userId,
        projectId,
        chatHistory: {
          ...chatHistory,
          activeStreamId: streamId,
          // messages: [],
        },
      });
    },
  });

  return response;
}

function streamLLMResponse(
  params: StreamCallSettings,
): StreamTextResult<ToolSet, never> {
  const newMessages: ModelMessage[] = [];
  let stepCount = 0;

  const streamTextResult = getLLMAsyncStream({
    ...params,
    newMessages,
    maxRecursionDepth,
    onStepFinish: async (value): Promise<void> => {
      stepCount++;
      if (value.finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
        const message = `We automatically stop the conversation after ${maxRecursionDepth} steps. Ask a new question to continue the conversation.`;
        // sendTextMessageToStream(params.serverResponse, message, messageId); //TODO: probably not needed anymore
        appendErrorMessage(value.response.messages, message);
        logger.warn(message);
      }
    },
    onFinish: async (result): Promise<void> => {
      const messages = result.response.messages;
      newMessages.push(...messages);
      if (result.finishReason === 'length') {
        appendErrorMessage(
          messages,
          'The message was truncated because the maximum tokens for the context window was reached.',
        );
      }

      await saveChatHistory({
        chatId: params.chatId,
        userId: params.userId,
        projectId: params.projectId,
        chatHistory: {
          ...params.chatHistory,
          messages: [
            ...params.chatHistory.messages,
            ...addUiToolResults(newMessages),
          ],
          activeStreamId: null,
        },
      });
      return closeMCPClients(params.mcpClients);
    },
    onError: (error) => {
      const errorMessage = unrecoverableError(params, error);
      newMessages.push(errorMessage);
    },
  });

  return streamTextResult;
}

function unrecoverableError(
  streamParams: StreamCallSettings,
  error: any,
): AssistantModelMessage {
  const errorMessage = extractMessage(error);
  logger.warn(
    `An unrecoverable exception occurred in the conversation. Message: ${errorMessage}`,
    error,
  );

  // sendTextMessageToStream(streamParams.serverResponse, errorMessage, messageId); //TODO: probably not needed anymore

  sendAiChatFailureEvent({
    projectId: streamParams.projectId,
    userId: streamParams.userId,
    chatId: streamParams.chatId,
    errorMessage,
    provider: streamParams.aiConfig.provider,
    model: streamParams.aiConfig.model,
  });

  return createAssistantMessage(errorMessage);
}

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  try {
    for (const mcpClient of mcpClients) {
      await (mcpClient as any)?.close();
    }
  } catch (error) {
    logger.warn('Failed to close mcp client.', error);
  }
}

function createAssistantMessage(message: string): AssistantModelMessage {
  return {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}

function appendErrorMessage(
  responseMessages: (AssistantModelMessage | ToolModelMessage)[],
  message: string,
): void {
  const lastMessage = responseMessages.at(-1);

  if (lastMessage?.role === 'assistant') {
    if (typeof lastMessage.content === 'string') {
      lastMessage.content += `\n${message}`;
    } else {
      lastMessage.content.push({
        type: 'text',
        text: message,
      });
    }
  } else {
    responseMessages.push({
      ...createAssistantMessage(message),
    });
  }
}
