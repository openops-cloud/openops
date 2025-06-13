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
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models';
import {
  appendMessagesToChatHistory,
  appendMessagesToChatHistoryContext,
} from './ai-chat.service';
import { summarizeChatHistory } from './ai-message-history-summarizer';
import { generateMessageId } from './ai-message-id-generator';
import { getMcpSystemPrompt } from './prompts.service';
import { selectRelevantTools } from './tools.service';

export type StreamParams = {
  userId: string;
  projectId: string;
  chatId: string;
  aiConfig: AiConfig;
  languageModel: LanguageModel;
  newMessage: CoreMessage;
  serverResponse: ServerResponse;
  allTools: ToolSet;
};

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

export function streamAIResponse({
  userId,
  projectId,
  chatId,
  aiConfig,
  languageModel,
  newMessage,
  serverResponse,
  allTools,
}: StreamParams): Promise<void> {
  return new Promise(function (resolve, reject) {
    pipeDataStreamToResponse(serverResponse, {
      execute: async (dataStreamWriter) => {
        logger.debug(`Send user message to LLM: "${newMessage.content}"`);

        sendAiChatMessageSendEvent({
          projectId,
          userId,
          chatId,
          provider: aiConfig.provider,
        });

        const result = await getAIResponse(
          chatId,
          aiConfig,
          languageModel,
          newMessage,
          allTools,
        );

        result.mergeIntoDataStream(dataStreamWriter);

        logger.debug('LLM response finished.');

        resolve();
      },
      onError: (error: unknown) => {
        const errorMessage = getErrorMessage(error);

        logger.warn(errorMessage);
        sendAiChatFailureEvent({
          chatId,
          errorMessage,
          userId,
          projectId,
          model: aiConfig.model,
          provider: aiConfig.provider,
        });

        const message = `${errorMessage}. \\nPlease try again.`;
        endStreamWithErrorMessage(serverResponse, message);

        reject();

        return '';
      },
    });
  });
}

async function getAIResponse(
  chatId: string,
  aiConfig: AiConfig,
  languageModel: LanguageModel,
  newMessage: CoreMessage,
  allTools: ToolSet,
): Promise<{ response: { messages: CoreMessage[] } }> {
  await appendMessagesToChatHistory(chatId, [newMessage]);
  const chatHistory = await appendMessagesToChatHistoryContext(chatId, [
    newMessage,
  ]);

  try {
    const result = await getAIResponseForMessages(
      chatHistory,
      languageModel,
      aiConfig,
      allTools,
    );
    const messages = result.response.messages;

    await appendMessagesToChatHistory(chatId, messages);
    await appendMessagesToChatHistoryContext(chatId, messages);

    return result;
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (isMaxTokensReachedError(errorMessage)) {
      await appendMessagesToChatHistoryContext(
        chatId,
        [],
        async (existingMessages) => {
          return summarizeChatHistory(
            existingMessages,
            languageModel,
            aiConfig,
          );
        },
      );
      const message = `\\n\\nThe message was truncated because the maximum tokens for the context window was reached. Please try again.`;
      throw new Error(message);
    }

    throw new Error(errorMessage);
  }
}

async function getAIResponseForMessages(
  chatHistory: CoreMessage[],
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  allTools: ToolSet,
): Promise<{ response: { messages: CoreMessage[] } }> {
  try {
    return await executeStreamText(
      chatHistory,
      languageModel,
      aiConfig,
      allTools,
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    if (!isMaxTokensReachedError(errorMessage)) {
      throw error;
    }

    const summarizedHistory = await summarizeChatHistory(
      chatHistory,
      languageModel,
      aiConfig,
    );

    return executeStreamText(
      summarizedHistory,
      languageModel,
      aiConfig,
      allTools,
    );
  }
}

async function executeStreamText(
  messages: CoreMessage[],
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  allTools: ToolSet,
): Promise<{ response: { messages: CoreMessage[] } }> {
  const filteredTools = await selectRelevantTools({
    messages,
    languageModel,
    aiConfig,
    tools: allTools,
  });

  const { systemPrompt, toolChoice } = await getPromptForSelectedTools(
    filteredTools,
  );

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    tools: filteredTools,
    toolChoice,
    maxRetries: 1,
    maxSteps: maxRecursionDepth,
    async onStepFinish({ finishReason }): Promise<void> {
      if (finishReason !== 'stop') {
        throw new Error(
          `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`,
        );
      }
    },
    async onError({ error }) {
      throw error;
    },
    async onFinish(result): Promise<void> {
      if (result.finishReason === 'length') {
        throw new Error('Message was truncated');
      }
    },
  });

  return result;
}

async function getPromptForSelectedTools(
  filteredTools: ToolSet | undefined,
): Promise<{ systemPrompt: string; toolChoice: ToolChoice<ToolSet> }> {
  const isAnalyticsLoaded = Object.keys(filteredTools ?? {}).some((key) =>
    key.includes('superset'),
  );
  const isTablesLoaded = Object.keys(filteredTools ?? {}).some((key) =>
    key.includes('table'),
  );

  let systemPrompt = await getMcpSystemPrompt({
    isAnalyticsLoaded,
    isTablesLoaded,
  });

  let toolChoice: ToolChoice<ToolSet> = 'auto';

  if (!filteredTools || Object.keys(filteredTools).length === 0) {
    toolChoice = 'none';
    systemPrompt += `\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
  }

  return { systemPrompt, toolChoice };
}

function getErrorMessage(error: any): string {
  return error instanceof Error ? error.message : String(error);
}

function isMaxTokensReachedError(errorMessage: string): boolean {
  return (
    errorMessage === 'Message was truncated' || errorMessage.includes('tokens')
  );
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
