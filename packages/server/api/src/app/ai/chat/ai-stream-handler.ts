/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import {
  CoreMessage,
  DataStreamWriter,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  ToolChoice,
  ToolSet,
} from 'ai';
import { ServerResponse } from 'http';
import { sendAiChatFailureEvent } from '../../telemetry/event-models';
import {
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
} from './ai-chat.service';
import {
  shouldTryToSummarize,
  summarizeChatHistoryContext,
} from './ai-message-history-summarizer';
import { generateMessageId } from './ai-message-id-generator';

export type StreamParams = {
  userId: string;
  chatId: string;
  projectId: string;
  tools?: ToolSet;
  aiConfig: AiConfig;
  systemPrompt: string;
  mcpClients: unknown[];
  handledError: boolean;
  attemptIndex?: number;
  messages: CoreMessage[];
  languageModel: LanguageModel;
  serverResponse: ServerResponse;
};

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

export function streamAIResponse(streamParams: StreamParams): void {
  pipeDataStreamToResponse(streamParams.serverResponse, {
    execute: async (dataStreamWriter) => {
      logger.debug('Send user message to LLM.');
      await streamMessages(dataStreamWriter, streamParams);
    },
    onError: (error) => {
      if (!streamParams.handledError) {
        // If the error was not handled, ask to try again.
        askToTryAgain(streamParams, error);
      }

      return '';
    },
  });
}

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  params: StreamParams,
): Promise<void> {
  const { languageModel, aiConfig, chatId } = params;

  params.handledError = false;
  let stepCount = 0;

  const { systemPrompt, toolChoice } = updateSystemPromptIfThereAreNoTools(
    params.systemPrompt,
    params.tools,
  );

  const result = streamText({
    model: params.languageModel,
    system: systemPrompt,
    messages: params.messages,
    ...aiConfig.modelSettings,
    tools: params.tools,
    toolChoice,
    maxRetries: 1,
    maxSteps: maxRecursionDepth,
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= maxRecursionDepth) {
        maximumRecursionReached(dataStreamWriter);
      }
    },
    async onError({ error }) {
      await handleStreamError(dataStreamWriter, params, error);
    },
    async onFinish(result): Promise<void> {
      if (result.finishReason === 'length') {
        await messageWasTruncated(
          dataStreamWriter,
          languageModel,
          aiConfig,
          chatId,
        );
      }

      const messages = result.response.messages;
      await appendMessagesToChatHistory(chatId, messages);
      await appendMessagesToChatHistoryContext(chatId, messages);

      await closeMCPClients(params.mcpClients);
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

function getErrorMessage(error: any): string {
  return error instanceof Error ? error.message : String(error);
}

function askToTryAgain(streamParams: StreamParams, error: unknown): void {
  const { chatId, aiConfig, languageModel, serverResponse } = streamParams;

  const errorMessage = getErrorMessage(error);
  summarizeChatHistoryContext(languageModel, aiConfig, chatId).catch((e) =>
    logger.warn('Failed to summarize message history.', e),
  );

  closeMCPClients(streamParams.mcpClients).catch((e) =>
    logger.warn('Failed to close mcp client.', e),
  );

  const message = `${errorMessage}. \\nPlease try again.`;
  endStreamWithErrorMessage(serverResponse, message);
  sendFailureEvent(streamParams, message);
  logger.warn(message);
}

function maximumRecursionReached(dataStreamWriter: DataStreamWriter): void {
  const message = `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
  endStreamWithErrorMessage(dataStreamWriter, message);
  logger.warn(message);
}

async function messageWasTruncated(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  chatId: string,
): Promise<void> {
  await summarizeChatHistoryContext(languageModel, aiConfig, chatId);
  const message = `\\n\\nThe message was truncated because the maximum tokens for the context window was reached. Please try again.`;
  endStreamWithErrorMessage(dataStreamWriter, message);
}

async function handleStreamError(
  dataStreamWriter: DataStreamWriter,
  params: StreamParams,
  error: unknown,
): Promise<void> {
  params.handledError = true;
  const errorMessage = getErrorMessage(error);

  params.attemptIndex = (params.attemptIndex ?? 0) + 1;
  if (!shouldTryToSummarize(errorMessage, params.attemptIndex)) {
    endStreamWithErrorMessage(dataStreamWriter, errorMessage);
    sendFailureEvent(params, errorMessage);
    logger.debug(errorMessage, error);
    return;
  }

  params.messages = await summarizeChatHistoryContext(
    params.languageModel,
    params.aiConfig,
    params.chatId,
  );

  await streamMessages(dataStreamWriter, params);
}

function updateSystemPromptIfThereAreNoTools(
  prompt: string,
  tools?: ToolSet,
): { systemPrompt: string; toolChoice: ToolChoice<Record<string, never>> } {
  let toolChoice: ToolChoice<Record<string, never>> = 'auto';
  let systemPrompt = prompt;
  if (!tools || Object.keys(tools).length === 0) {
    toolChoice = 'none';
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  return { systemPrompt, toolChoice };
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

async function closeMCPClients(mcpClients: unknown[]): Promise<void> {
  for (const mcpClient of mcpClients) {
    await (mcpClient as any)?.close();
  }
}

function sendFailureEvent(params: StreamParams, message: string): void {
  sendAiChatFailureEvent({
    chatId: params.chatId,
    errorMessage: message,
    userId: params.userId,
    projectId: params.projectId,
    model: params.aiConfig.model,
    provider: params.aiConfig.provider,
  });
}
