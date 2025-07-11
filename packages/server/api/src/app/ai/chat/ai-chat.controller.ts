import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
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
  pipeDataStreamToResponse,
  streamText,
  TextPart,
} from 'ai';
import { StatusCodes } from 'http-status-codes';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../telemetry/event-models/ai';
import {
  ChatContext,
  createChatContext,
  deleteChatHistory,
  generateChatId,
  getChatHistory,
  getConversation,
  getLLMConfig,
  saveChatHistory,
} from './ai-chat.service';
import { streamCode } from './code.service';
import { enrichContext } from './context-enrichment.service';
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

    try {
      const conversationResult = await getConversation(chatId);
      const llmConfigResult = await getLLMConfig(projectId);

      const messages = request.body.messages as CoreMessage[];
      const { chatContext } = conversationResult;
      const { aiConfig, languageModel } = llmConfigResult;

      pipeDataStreamToResponse(reply.raw, {
        execute: async (dataStreamWriter) => {
          const result = streamText({
            model: languageModel,
            system: await getSystemPrompt(chatContext),
            messages,
            ...aiConfig.modelSettings,
            async onFinish({ response }) {
              response.messages.forEach((r) => {
                messages.push(getResponseObject(r));
              });

              await saveChatHistory(chatId, messages);
            },
          });

          result.mergeIntoDataStream(dataStreamWriter);
          sendAiChatMessageSendEvent({
            projectId,
            userId: request.principal.id,
            chatId,
            provider: aiConfig.provider,
          });
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          sendAiChatFailureEvent({
            projectId,
            userId: request.principal.id,
            chatId,
            errorMessage,
            provider: aiConfig.provider,
            model: aiConfig.model,
          });

          return errorMessage;
        },
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        return reply.code(400).send({ message: error.message });
      }

      logger.error('Failed to process conversation with error: ', error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
  });

  app.post('/code', CodeGenerationOptions, async (request, reply) => {
    const chatId = request.body.chatId;
    const projectId = request.principal.projectId;

    try {
      const conversationResult = await getConversation(chatId);
      const llmConfigResult = await getLLMConfig(projectId);

      const messages = request.body.messages as CoreMessage[];
      const { chatContext } = conversationResult;
      const { aiConfig, languageModel } = llmConfigResult;

      const enrichedContext = request.body.additionalContext
        ? await enrichContext(request.body.additionalContext, projectId)
        : undefined;

      const result = streamCode({
        messages,
        languageModel,
        aiConfig,
        systemPrompt: await getSystemPrompt(chatContext, enrichedContext),
      });

      return result.toTextStreamResponse();
    } catch (error) {
      if (error instanceof ApplicationError) {
        return reply.code(400).send({ message: error.message });
      }

      logger.error('Failed to process code generation with error: ', error);
      return reply.code(500).send({ message: 'Internal server error' });
    }
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
        logger.error('Failed to delete chat history with error: ', { error });
        return reply.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
          message: 'Failed to delete chat history',
        });
      }
    },
  );
};

const OpenChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Initialize a new chat session or resume an existing one. This endpoint creates a unique chat ID and context for the conversation, storing the workflow, block, step, and action information for future reference.',
    body: OpenChatRequest,
  },
};

const NewMessageOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Send a message to the AI chat session and receive a streaming response. This endpoint processes the user message, generates an AI response using the configured language model, and maintains the conversation history.',
    body: NewMessageRequest,
  },
};

const CodeGenerationOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      "Generate code based on the user's request. This endpoint processes the user message and generates a code response using the configured language model.",
    body: NewMessageRequest,
  },
};

const DeleteChatOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai', 'ai-chat'],
    description:
      'Delete a chat session and its associated history. This endpoint removes all messages and context data for the specified chat ID, effectively ending the conversation.',
    params: DeleteChatHistoryRequest,
  },
};

function getResponseObject(message: CoreAssistantMessage | CoreToolMessage): {
  role: 'assistant';
  content: string | Array<TextPart>;
} {
  if (message.role === 'tool') {
    return {
      role: 'assistant',
      content: 'Messages received with the tool role are not supported.',
    };
  }

  const content = message.content;
  if (typeof content !== 'string' && Array.isArray(content)) {
    for (const part of content) {
      if (part.type !== 'text') {
        return {
          role: 'assistant',
          content: `Invalid message type received. Type: ${part.type}`,
        };
      }
    }

    return {
      role: 'assistant',
      content: content as TextPart[],
    };
  }

  return {
    role: 'assistant',
    content,
  };
}
