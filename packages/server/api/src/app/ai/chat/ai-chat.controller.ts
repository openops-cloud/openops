import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { getAiProviderLanguageModel } from '@openops/common';
import { logger } from '@openops/server-shared';
import {
  AiConfig,
  DeleteChatHistoryRequest,
  NewMessageRequest,
  OpenChatRequest,
  OpenChatResponse,
  PrincipalType,
} from '@openops/shared';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataStreamWriter,
  experimental_createMCPClient,
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
  ChatContext,
  createChatContext,
  deleteChatHistory,
  generateChatId,
  getChatContext,
  getChatHistory,
  saveChatHistory,
} from './ai-chat.service';
import { getSystemPrompt } from './prompts.service';

export const aiChatController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/open',
    OpenChatOptions,
    async (request, reply): Promise<OpenChatResponse> => {
      const chatContext: ChatContext = {
        workflowId: request.body.workflowId,
        blockName: request.body.blockName,
        stepName: request.body.stepName,
        actionName: request.body.actionName,
      };

      const chatId = generateChatId({
        ...chatContext,
        userId: request.principal.id,
      });

      const messages = await getChatHistory(chatId);

      if (messages.length === 0) {
        await createChatContext(chatId, chatContext);
      }

      return reply.code(200).send({
        chatId,
        messages,
      });
    },
  );

  app.post('/conversation', NewMessageOptions, async (request, reply) => {
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

    const tools = await getTools();
    pipeDataStreamToResponse(reply.raw, {
      execute: async (dataStreamWriter) => {
        logger.debug('Send user message to LLM.');
        await streamMessages(
          dataStreamWriter,
          messages,
          chatId,
          languageModel,
          chatContext,
          aiConfig,
          tools,
        );
      },
      onError: (error) => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  });

  app.delete(
    '/conversation/:chatId',
    DeleteChatOptions,
    async (request, reply) => {
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
    },
  );
};

async function streamMessages(
  dataStreamWriter: DataStreamWriter,
  messages: CoreMessage[],
  chatId: string,
  languageModel: LanguageModel,
  chatContext: ChatContext,
  aiConfig: AiConfig,
  tools: ToolSet,
): Promise<void> {
  const result = streamText({
    model: languageModel,
    system: await getSystemPrompt(chatContext),
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

      if (
        response.messages[response.messages.length - 1].role !== 'assistant'
      ) {
        logger.debug('Forwarding the message to LLM.');
        await streamMessages(
          dataStreamWriter,
          messages,
          chatId,
          languageModel,
          chatContext,
          aiConfig,
          tools,
        );
      }
    },
  });

  result.mergeIntoDataStream(dataStreamWriter);
}

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Opens a chat session, either starting fresh or resuming prior messages if the conversation has history.',
    body: OpenChatRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description: 'Sends a message to the chat session',
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description: 'Deletes a chat history chat ID.',
    params: DeleteChatHistoryRequest,
  },
};

function getResponseObject(
  message: CoreAssistantMessage | CoreToolMessage,
): CoreToolMessage | CoreAssistantMessage {
  if (message.role === 'tool') {
    return {
      role: message.role,
      content: message.content as ToolResultPart[],
    };
  }

  const content = message.content;
  if (typeof content !== 'string' && Array.isArray(content)) {
    let flag = false;
    for (const part of content) {
      if (part.type === 'tool-call') {
        flag = true;
        continue;
      }

      if (part.type !== 'text') {
        return {
          role: 'assistant',
          content: `Invalid message type received. Type: ${part.type}`,
        };
      }
    }

    if (flag) {
      return {
        role: message.role,
        content: content as ToolCallPart[],
      };
    }

    return {
      role: message.role,
      content: content as TextPart[],
    };
  }

  return {
    role: 'assistant',
    content,
  };
}

async function getTools(): Promise<ToolSet> {
  const supersetClient = await experimental_createMCPClient({
    transport: {
      type: 'sse',
      url: 'http://localhost:8000/sse',
      // url: 'http://localhost:3001/openops-tables/mcp/3S7D1gBhLZsBDnfLsuquYcYyqpZB5qxf/sse',
    },
  });

  return supersetClient.tools();
}
