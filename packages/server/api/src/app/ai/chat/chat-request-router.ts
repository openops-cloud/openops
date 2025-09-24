import { logger } from '@openops/server-shared';
import { CODE_BLOCK_NAME, NewMessageRequest, Principal } from '@openops/shared';
import { UIMessage } from 'ai';
import { FastifyInstance, FastifyReply } from 'fastify';
import { sendAiChatMessageSendEvent } from '../../telemetry/event-models';
import { getConversation, getLLMConfig } from './ai-chat.service';
import { handleCodeGenerationRequest } from './code-generation-handler';
import { handleUserMessage } from './user-message-handler';
import { makeWaitUntil } from './utils';

export type ChatRequestContext = {
  request: {
    body: NewMessageRequest;
    principal: Principal;
    headers: {
      authorization?: string;
    };
  };
  reply: FastifyReply;
  app: FastifyInstance;
  newMessage: UIMessage;
};

export async function routeChatRequest(
  params: ChatRequestContext,
): Promise<Response> {
  const { app, request, newMessage, reply: fastifyReply } = params;
  const serverResponse = fastifyReply.raw;

  const chatId = request.body.chatId;
  const userId = request.principal.id;
  const projectId = request.principal.projectId;
  const authToken = request.headers.authorization?.replace('Bearer ', '') ?? '';

  const conversation = await getConversation(chatId, userId, projectId);
  const isCodeGenerationRequest =
    conversation.chatContext?.blockName === CODE_BLOCK_NAME;

  const { aiConfig, languageModel } = await getLLMConfig(projectId);

  conversation.chatHistory.messages.push(newMessage);

  const waitUntil = makeWaitUntil(fastifyReply);

  const generationRequestParams = {
    app,
    authToken,
    chatId,
    userId,
    projectId,
    newMessage,
    serverResponse,
    conversation,
    aiConfig,
    languageModel,
    additionalContext: request.body.additionalContext,
    frontendTools: request.body.tools || {},
    waitUntil,
  };

  sendAiChatMessageSendEvent({
    projectId,
    userId,
    chatId,
    provider: aiConfig.provider,
  });

  if (isCodeGenerationRequest) {
    logger.debug('Using code generation flow');
    return handleCodeGenerationRequest(generationRequestParams);
  } else {
    logger.debug('Using normal conversation flow');
    return handleUserMessage(generationRequestParams);
  }
}
