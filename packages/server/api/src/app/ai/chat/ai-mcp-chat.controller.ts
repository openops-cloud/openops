import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  AiConfig,
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatMCPRequest,
  OpenChatResponse,
  openOpsId,
  PrincipalType,
} from '@openops/shared';
import {
  CoreMessage,
  DataStreamWriter,
  generateText,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  ToolSet,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import { encryptUtils } from '../../helper/encryption';
import { aiConfigService } from '../config/ai-config.service';
import { getMCPTools } from '../mcp/mcp-tools';
import {
  appendMessagesToChatHistory,
  appendMessagesToSummarizedChatHistory,
  createChatContext,
  deleteChatHistory,
  deleteSummarizedChatHistory,
  generateChatIdForMCP,
  getChatContext,
  getChatHistory,
  getSummarizedChatHistory,
} from './ai-chat.service';
import { getMcpSystemPrompt } from './prompts.service';

let historyMaxTokens: number;
let historyMaxMessages: number;
const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

export const aiMCPChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const { chatId: inputChatId } = request.body;
      const { id: userId } = request.principal;

      if (inputChatId) {
        const existingContext = await getChatContext(inputChatId);

        if (existingContext) {
          const messages = await getChatHistory(inputChatId);
          return reply.code(200).send({
            chatId: inputChatId,
            messages,
          });
        }
      }

      const newChatId = openOpsId();
      const chatId = generateChatIdForMCP({ chatId: newChatId, userId });
      const chatContext = { chatId: newChatId };

      await createChatContext(chatId, chatContext);
      const messages = await getChatHistory(chatId);

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );
  app.post('/', NewMessageOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const projectId = request.principal.projectId;
    const chatContext = await getChatContext(chatId);
    if (!chatContext) {
      return reply
        .code(404)
        .send('No chat session found for the provided chat ID.');
    }

    const aiConfig = await aiConfigService.getActiveConfigWithApiKey(projectId);
    if (!aiConfig) {
      return reply
        .code(404)
        .send('No active AI configuration found for the project.');
    }

    const apiKey = encryptUtils.decryptString(JSON.parse(aiConfig.apiKey));
    const languageModel = await getAiProviderLanguageModel({
      apiKey,
      model: aiConfig.model,
      provider: aiConfig.provider,
      providerSettings: aiConfig.providerSettings,
    });

    const newMessage: CoreMessage = {
      role: 'user',
      content: request.body.message,
    };

    await appendMessagesToChatHistory(chatId, [newMessage]);
    await appendMessagesToSummarizedChatHistory(chatId, [newMessage]);

    const tools = await getMCPTools();
    const isAnalyticsLoaded = Object.keys(tools).includes('superset');
    const isTablesLoaded = Object.keys(tools).includes('table');

    const systemPrompt = await getMcpSystemPrompt({
      isAnalyticsLoaded,
      isTablesLoaded,
    });
    logger.debug({ systemPrompt }, 'systemPrompt');

    pipeDataStreamToResponse(reply.raw, {
      execute: async (dataStreamWriter) => {
        logger.debug('Send user message to LLM.');
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          chatId,
          tools,
        );
      },
      onError: (error) => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  });

  app.delete('/:chatId', DeleteChatOptions, async (request, reply) => {
    const { chatId } = request.params;

    try {
      await deleteChatHistory(chatId);
      await deleteSummarizedChatHistory(chatId);
      return await reply.code(StatusCodes.OK).send();
    } catch (error) {
      logger.error('Failed to delete chat history with error: ', error);
      return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
        message: 'Failed to delete chat history',
      });
    }
  });
};

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description:
      'Opens a chat session, either starting fresh or resuming prior messages if the conversation has history.',
    body: OpenChatMCPRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Sends a message to the chat session',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat-mcp'],
    description: 'Deletes chat history by chat ID.',
    params: DeleteChatHistoryRequest,
  },
};

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  chatId: string,
  tools: ToolSet,
  recursionDepth = 0,
): Promise<void> {
  const chatHistory = await getSummarizedChatHistory(chatId);
  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools,
    toolChoice: 'auto',
    maxRetries: 0,
    async onError({ error }) {
      const message = error instanceof Error ? error.message : String(error);
      endStreamWithErrorMessage(dataStreamWriter, message);
      logger.warn(message, error);
    },
    async onFinish({ response, usage }) {
      await appendMessagesToChatHistory(chatId, response.messages);
      await appendMessagesToSummarizedChatHistory(
        chatId,
        response.messages,
        (existingMessages) =>
          summarizeMessages(
            languageModel,
            aiConfig,
            existingMessages,
            usage.totalTokens,
          ),
      );

      const lastMessage = response.messages.at(-1);
      if (lastMessage && lastMessage.role !== 'assistant') {
        if (recursionDepth >= maxRecursionDepth) {
          const message = `Maximum recursion depth (${maxRecursionDepth}) reached. Terminating recursion.`;
          endStreamWithErrorMessage(dataStreamWriter, message);
          logger.warn(message);
          return;
        }

        logger.debug('Forwarding the message to LLM.');
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          chatId,
          tools,
          recursionDepth + 1,
        );
      }
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

function endStreamWithErrorMessage(
  dataStreamWriter: DataStreamWriter,
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

function generateMessageId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(18));
  const base64url = Array.from(randomBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);

  return `msg-${base64url}`;
}

async function summarizeMessages(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  totalTokens: number,
): Promise<CoreMessage[]> {
  const maxTokens = getHistoryMaxTokens(aiConfig);
  let debugMessage = `Token count ${totalTokens}, which exceeds the configured limit of ${maxTokens}. Summarizing messages.`;
  if (isNaN(totalTokens)) {
    const maxMessages = getHistoryMaxMessages();
    debugMessage = `Message count is ${messages.length}, which exceeds the configured limit of ${maxMessages}. Summarizing messages.`;
    logger.debug(
      `The model is not providing token usage. Checking if the number of messages exceeds ${maxMessages}.`,
    );
    if (messages.length < maxMessages) {
      return messages;
    }
  } else if (totalTokens < maxTokens) {
    return messages;
  }

  logger.info(debugMessage);

  const { text } = await getSummaryMessage(
    languageModel,
    aiConfig,
    messages,
    maxTokens,
  );

  return [
    {
      role: 'system',
      content: `The following is a summary of the previous conversation: ${text}`,
    },
  ];
}

async function getSummaryMessage(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  maxTokens: number,
): Promise<{ text: string }> {
  const systemPrompt =
    'You are a helpful assistant tasked with summarizing conversations. Create concise summaries that preserve key context.';

  return generateText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    maxTokens,
  });
}

function getHistoryMaxTokens(aiConfig: AiConfig): number {
  if (historyMaxTokens) {
    return historyMaxTokens;
  }

  const modelMax = aiConfig.modelSettings?.maxTokens;
  if (typeof modelMax === 'number') {
    historyMaxTokens = modelMax / 2;
  } else {
    const defaultMax = system.getNumberOrThrow(
      AppSystemProp.MAX_TOKENS_IN_LLM_HISTORY,
    );
    historyMaxTokens = defaultMax / 2;
  }

  return historyMaxTokens;
}

function getHistoryMaxMessages(): number {
  if (historyMaxMessages) {
    return historyMaxMessages;
  }

  historyMaxMessages = system.getNumberOrThrow(
    AppSystemProp.MAX_MESSAGES_IN_LLM_HISTORY,
  );

  return historyMaxMessages;
}
