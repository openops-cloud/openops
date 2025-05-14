import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { logger } from '@openops/server-shared';
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
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataStreamWriter,
  LanguageModel,
  pipeDataStreamToResponse,
  streamText,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ToolSet,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import { encryptUtils } from '../../helper/encryption';
import { aiConfigService } from '../config/ai-config.service';
import {
  createChatContext,
  deleteChatHistory,
  generateChatIdForMCP,
  getChatContext,
  getChatHistory,
  saveChatHistory,
} from './ai-chat.service';
import { getMcpSystemPrompt } from './prompts.service';

const MAX_RECURSION_DEPTH = 5;

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

    const messages = await getChatHistory(chatId);
    messages.push({
      role: 'user',
      content: request.body.message,
    });

    const systemPrompt = await getMcpSystemPrompt();
    const tools = await getTools();

    pipeDataStreamToResponse(reply.raw, {
      execute: async (dataStreamWriter) => {
        logger.debug('Send user message to LLM.');
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          messages,
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

/**
 * Stub function for fetching tools. This function currently returns an empty ToolSet.
 * Future implementation should populate the ToolSet with the required tools.
 */
async function getTools(): Promise<ToolSet> {
  return {};
}

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  languageModel: LanguageModel,
  systemPrompt: string,
  aiConfig: AiConfig,
  messages: CoreMessage[],
  chatId: string,
  tools: ToolSet,
  recursionDepth = 0,
): Promise<void> {
  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    ...aiConfig.modelSettings,
    tools,
    toolChoice: 'auto',
    maxRetries: 1,
    async onFinish({ response }) {
      response.messages.forEach((r) => {
        messages.push(getResponseObject(r));
      });

      await saveChatHistory(chatId, messages);

      const lastMessage = response.messages.at(-1);
      if (lastMessage && lastMessage.role !== 'assistant') {
        if (recursionDepth >= MAX_RECURSION_DEPTH) {
          logger.warn(
            `Maximum recursion depth (${MAX_RECURSION_DEPTH}) reached. Terminating recursion.`,
          );
          return;
        }

        logger.debug('Forwarding the message to LLM.');
        await streamMessages(
          dataStreamWriter,
          languageModel,
          systemPrompt,
          aiConfig,
          messages,
          chatId,
          tools,
          recursionDepth + 1,
        );
      }
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
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
