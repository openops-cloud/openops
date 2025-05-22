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
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  ToolSet,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import { encryptUtils } from '../../helper/encryption';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models/ai';
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
import { summarizeMessages } from './ai-message-history-summarizer';
import { generateMessageId } from './ai-message-id-generator';
import { getMcpSystemPrompt } from './prompts.service';

const maxRecursionDepth = system.getNumberOrThrow(
  AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION,
);

const MAX_RECURSION_DEPTH = 10;
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
    const isAnalyticsLoaded = Object.keys(tools).some((key) =>
      key.includes('superset'),
    );
    const isTablesLoaded = Object.keys(tools).some((key) =>
      key.includes('table'),
    );

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
        const message = error instanceof Error ? error.message : String(error);
        sendAiChatFailureEvent({
          projectId,
          userId: request.principal.id,
          chatId,
          errorMessage: message,
          provider: aiConfig.provider,
          model: aiConfig.model,
        });

        endStreamWithErrorMessage(reply.raw, message);
        logger.warn(message, error);
        return message;
      },
    });

    sendAiChatMessageSendEvent({
      projectId,
      userId: request.principal.id,
      chatId,
      provider: aiConfig.provider,
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
): Promise<void> {
  let stepCount = 0;
  const chatHistory = await getSummarizedChatHistory(chatId);
  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages: chatHistory,
    ...aiConfig.modelSettings,
    tools,
    toolChoice: 'auto',
    maxRetries: 1,
    maxSteps: MAX_RECURSION_DEPTH,
    async onStepFinish({ finishReason }): Promise<void> {
      stepCount++;
      if (finishReason !== 'stop' && stepCount >= MAX_RECURSION_DEPTH) {
        const message = `Maximum recursion depth (${MAX_RECURSION_DEPTH}) reached. Terminating recursion.`;
        endStreamWithErrorMessage(dataStreamWriter, message);
        logger.warn(message);
      }
    },
    async onFinish({ response, usage }): Promise<void> {
      const filteredMessages = removeToolMessages(messages);
      response.messages.forEach((r) => {
        filteredMessages.push(getResponseObject(r));
      });
    
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

      await saveChatHistory(chatId, filteredMessages);
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
