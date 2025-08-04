/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  LanguageModel,
  TextStreamPart,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { addUiToolResults } from '../mcp/tool-utils';
import { getMCPToolsContext } from '../mcp/tools-context-builder';
import { AssistantUITools } from '../mcp/types';
import { saveChatHistory } from './ai-chat.service';
import { generateMessageId } from './ai-id-generators';
import { getLLMAsyncStream } from './llm-stream-handler';
import {
  buildDoneMessage,
  buildMessageIdMessage,
  buildTextMessage,
} from './stream-message-builder';
import { ChatProcessingContext, RequestContext } from './types';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

type UserMessageParams = RequestContext &
  ChatProcessingContext & {
    authToken: string;
    app: FastifyInstance;
  } & {
    frontendTools: AssistantUITools;
  };

type ModelConfig = {
  aiConfig: AiConfig;
  languageModel: LanguageModel;
};

type StreamCallSettings = RequestContext &
  ModelConfig & {
    tools?: ToolSet;
    systemPrompt: string;
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
    conversation: { chatContext, chatHistory },
    frontendTools,
  } = params;

  serverResponse.write(buildMessageIdMessage(generateMessageId()));

  chatHistory.push(newMessage);

  const { mcpClients, systemPrompt, filteredTools } = await getMCPToolsContext(
    app,
    projectId,
    authToken,
    aiConfig,
    chatHistory,
    chatContext,
    languageModel,
    frontendTools,
  );

  try {
    const newMessages = await streamLLMResponse({
      userId,
      chatId,
      projectId,
      aiConfig,
      chatHistory,
      systemPrompt,
      languageModel,
      serverResponse,
      tools: filteredTools,
    });

    await saveChatHistory(chatId, userId, projectId, [
      ...chatHistory,
      ...addUiToolResults(newMessages),
    ]);
  } finally {
    await closeMCPClients(mcpClients);
    serverResponse.write(buildDoneMessage('stop'));
    serverResponse.end();
  }
}

async function streamLLMResponse(
  params: StreamCallSettings,
): Promise<CoreMessage[]> {
  const newMessages: CoreMessage[] = [];
  let stepCount = 0;

  try {
    const fullStream = getLLMAsyncStream({
      ...params,
      newMessages,
      maxRecursionDepth,
      onStepFinish: async (value): Promise<void> => {
        stepCount++;
        if (value.finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
          const message = ` Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
          sendTextMessageToStream(params.serverResponse, message);
          appendErrorMessage(value.response.messages, message);
          logger.warn(message);
        }
      },
      onFinish: async (result): Promise<void> => {
        const messages = result.response.messages;
        newMessages.push(...messages);

        if (result.finishReason === 'length') {
          throw new Error(
            'The message was truncated because the maximum tokens for the context window was reached.',
          );
        }
      },
    });

    for await (const message of fullStream) {
      sendMessageToStream(params.serverResponse, message);
    }
  } catch (error) {
    const errorMessage = unrecoverableError(params, error);
    newMessages.push(errorMessage);
  }

  return newMessages;
}

function unrecoverableError(
  streamParams: StreamCallSettings,
  error: any,
): CoreAssistantMessage {
  const errorMessage = error instanceof Error ? error.message : String(error);
  streamParams.serverResponse.write(`0:"\\n\\n"\n`);
  streamParams.serverResponse.write(buildTextMessage(errorMessage));
  logger.warn(errorMessage, error);

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

function createAssistantMessage(message: string): CoreAssistantMessage {
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
  responseMessages: ((CoreAssistantMessage | CoreToolMessage) & {
    id: string;
  })[],
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
      id: generateMessageId(),
    });
  }
}

// This is based on the ai-sdk streaming codes
// https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#error-part
function sendMessageToStream(
  responseStream: NodeJS.WritableStream,
  message: TextStreamPart<ToolSet>,
): void {
  switch (message.type as string) {
    case 'text-delta':
      sendTextMessageToStream(responseStream, (message as any).textDelta);
      break;
    case 'tool-result':
      responseStream.write(`a:${JSON.stringify(message)}\n`);
      break;
    case 'tool-call': {
      responseStream.write(`9:${JSON.stringify(message)}\n`);
      break;
    }
    case 'tool-call-streaming-start': {
      responseStream.write(`b:${JSON.stringify(message)}\n`);
      break;
    }
    case 'tool-call-delta': {
      responseStream.write(`c:${JSON.stringify(message)}\n`);
      break;
    }
  }
}

function sendTextMessageToStream(
  responseStream: NodeJS.WritableStream,
  message: string,
): void {
  responseStream.write(buildTextMessage(message));
}
