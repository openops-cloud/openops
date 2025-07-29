import { isLLMTelemetryEnabled } from '@openops/common';
import { logger } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataStreamWriter,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  TextPart,
  ToolCallPart,
  ToolChoice,
  ToolResultPart,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';
import { ServerResponse } from 'node:http';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import { getMCPToolsContext } from '../mcp/tools-context-builder';
import {
  getConversation,
  getLLMConfig,
  saveChatHistory,
} from './ai-chat.service';
import { generateMessageId } from './ai-message-id-generator';

const MAX_RECURSION_DEPTH = 10;

type RequestContext = {
  userId: string;
  chatId: string;
  projectId: string;
  serverResponse: ServerResponse;
};

type UserMessageParams = RequestContext & {
  authToken: string;
  app: FastifyInstance;
  newMessage: CoreMessage;
};

export async function handleUserMessage(
  params: UserMessageParams,
): Promise<void> {
  const {
    app,
    chatId,
    userId,
    projectId,
    authToken,
    newMessage,
    serverResponse,
  } = params;

  const { aiConfig, languageModel } = await getLLMConfig(projectId);
  const { chatContext, messages } = await getConversation(
    chatId,
    userId,
    projectId,
  );

  messages.push(newMessage);

  const { mcpClients, systemPrompt, filteredTools } = await getMCPToolsContext(
    app,
    projectId,
    authToken,
    aiConfig,
    messages,
    chatContext,
    languageModel,
  );

  pipeDataStreamToResponse(serverResponse, {
    execute: async (dataStreamWriter) => {
      logger.debug('Send user message to LLM.');
      await streamMessages(
        dataStreamWriter,
        languageModel,
        systemPrompt,
        aiConfig,
        messages,
        chatId,
        mcpClients,
        userId,
        projectId,
        filteredTools,
      );
    },

    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      sendAiChatFailureEvent({
        projectId,
        userId,
        chatId,
        errorMessage: message,
        provider: aiConfig.provider,
        model: aiConfig.model,
      });

      endStreamWithErrorMessage(serverResponse, message);
      closeMCPClients(mcpClients).catch((e) =>
        logger.warn('Failed to close mcp client.', e),
      );
      logger.warn(message, error);
      return message;
    },
  });

  sendAiChatMessageSendEvent({
    projectId,
    userId,
    chatId,
    provider: aiConfig.provider,
  });
}

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  chatId: string,
  mcpClients: unknown[],
  userId: string,
  projectId: string,
  tools?: ToolSet,
): Promise<void> {
  let stepCount = 0;

  let toolChoice: ToolChoice<Record<string, never>> = 'auto';
  if (!tools || Object.keys(tools).length === 0) {
    toolChoice = 'none';
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    tools,
    toolChoice,
    maxRetries: 1,
    maxSteps: MAX_RECURSION_DEPTH,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= MAX_RECURSION_DEPTH) {
        const message = `Maximum recursion depth (${MAX_RECURSION_DEPTH}) reached. Terminating recursion.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
        logger.warn(message);
      }
    },
    async onFinish({ response }): Promise<void> {
      await saveChatHistory(chatId, userId, projectId, [
        ...messages,
        ...response.messages.map(getResponseObject),
      ]);
      await closeMCPClients(mcpClients);
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

function endStreamWithErrorMessage(
  dataStreamWriter: NodeJS.WritableStream | DataStreamWriter,
  message: string,
): void {
  dataStreamWriter.write(`f:{"messageId":"${generateMessageId()}"}\n`);

  dataStreamWriter.write(`0:"${message}"\n`);

  dataStreamWriter.write(
    `e:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null},"isContinued":false}\n`,
  );
  dataStreamWriter.write(
    `d:{"finishReason":"stop","usage":{"promptTokens":null,"completionTokens":null}}\n`,
  );
}

function getResponseObject(
  message: CoreAssistantMessage | CoreToolMessage,
): CoreToolMessage | CoreAssistantMessage {
  const { role, content } = message;

  if (role === 'tool') {
    return {
      role: message.role,
      content: message.content as ToolResultPart[],
    };
  }

  if (Array.isArray(content)) {
    let hasToolCall = false;

    for (const part of content) {
      if (part.type === 'tool-call') {
        hasToolCall = true;
      } else if (part.type !== 'text') {
        return {
          role: 'assistant',
          content: `Invalid message type received. Type: ${part.type}`,
        };
      }
    }

    return {
      role,
      content: hasToolCall
        ? (content as ToolCallPart[])
        : (content as TextPart[]),
    };
  }

  return {
    role: 'assistant',
    content,
  };
}

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  for (const mcpClient of mcpClients) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (mcpClient as any)?.close();
  }
}
