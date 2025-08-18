/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import {
  AssistantModelMessage,
  LanguageModel,
  ModelMessage,
  TextStreamPart,
  ToolModelMessage,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';
import { extractErrorMessage } from '../../../lib/error-utils';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import { addUiToolResults } from '../mcp/tool-utils';
import { getMCPToolsContext } from '../mcp/tools-context-builder';
import { AssistantUITools } from '../mcp/types';
import { saveChatHistory } from './ai-chat.service';
import { generateMessageId } from './ai-id-generators';
import { getLLMAsyncStream } from './llm-stream-handler';
import {
  doneMarker,
  finishMessagePart,
  finishStepPart,
  sendTextMessageToStream,
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
    chatHistory: ModelMessage[];
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
    languageModel,
    serverResponse,
    conversation: { chatContext, chatHistory },
    frontendTools,
  } = params;

  const messageId = generateMessageId();

  const { mcpClients, systemPrompt, filteredTools } = await getMCPToolsContext({
    app,
    projectId,
    authToken,
    aiConfig,
    messages: chatHistory,
    chatContext,
    languageModel,
    frontendTools,
  });

  try {
    const newMessages = await streamLLMResponse(
      {
        userId,
        chatId,
        projectId,
        aiConfig,
        chatHistory,
        systemPrompt,
        languageModel,
        serverResponse,
        tools: filteredTools,
      },
      messageId,
    );

    serverResponse.write(finishStepPart);
    serverResponse.write(finishMessagePart);

    await saveChatHistory(chatId, userId, projectId, [
      ...chatHistory,
      ...addUiToolResults(newMessages),
    ]);
  } finally {
    await closeMCPClients(mcpClients);
    serverResponse.write(doneMarker);
    serverResponse.end();
  }
}

async function streamLLMResponse(
  params: StreamCallSettings,
  messageId: string,
): Promise<ModelMessage[]> {
  const newMessages: ModelMessage[] = [];
  let stepCount = 0;

  try {
    const fullStream = getLLMAsyncStream({
      ...params,
      newMessages,
      maxRecursionDepth,
      onStepFinish: async (value): Promise<void> => {
        stepCount++;
        if (value.finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
          const message = `We automatically stop the conversation after ${maxRecursionDepth} steps. Ask a new question to continue the conversation.`;
          sendTextMessageToStream(params.serverResponse, message, messageId);
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
): AssistantModelMessage {
  const errorMessage = extractErrorMessage(error);
  logger.warn(
    `An unrecoverable error occurred in the conversation. Message: ${errorMessage}`,
    error,
  );

  const messageId = generateMessageId();
  sendTextMessageToStream(streamParams.serverResponse, errorMessage, messageId);

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

// This is based on the ai-sdk streaming codes
// https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#error-part
function sendMessageToStream(
  responseStream: NodeJS.WritableStream,
  message: TextStreamPart<ToolSet>,
): void {
  switch (message.type as string) {
    case 'text-delta':
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'text-delta',
          id: (message as any).id,
          delta: (message as any).text,
        })}`,
      );
      break;
    case 'tool-input-start':
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'tool-input-start',
          toolCallId: (message as any).id,
          toolName: (message as any).toolName,
        })}`,
      );
      break;
    case 'tool-input-delta':
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'tool-input-delta',
          toolCallId: (message as any).id,
          inputTextDelta: (message as any).delta,
        })}`,
      );
      break;
    case 'tool-call':
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'tool-input-available',
          toolCallId: (message as any).toolCallId,
          toolName: (message as any).toolName,
          input: (message as any).input,
        })}`,
      );
      break;
    case 'tool-result':
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'tool-output-available',
          toolCallId: (message as any).toolCallId,
          output: (message as any).output,
        })}`,
      );
      break;
    case 'start-step':
      responseStream.write(`data: ${JSON.stringify({ type: 'start-step' })}`);
      break;
    case 'finish-step':
    case 'finish':
    case 'tool-input-end':
      return;
    default:
      responseStream.write(`data: ${JSON.stringify(message)}`);
      break;
  }

  responseStream.write('\n\n');
}
