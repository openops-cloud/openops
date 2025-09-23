import { logger } from '@openops/server-shared';
import { CODE_BLOCK_NAME, NewMessageRequest, Principal } from '@openops/shared';
import { ModelMessage } from 'ai';
import { FastifyInstance, FastifyReply } from 'fastify';
import { ServerResponse } from 'node:http';
import { sendAiChatMessageSendEvent } from '../../telemetry/event-models';
import { getConversation, getLLMConfig } from './ai-chat.service';
import { handleCodeGenerationRequest } from './code-generation-handler';
import { handleUserMessage } from './user-message-handler';

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
  newMessage: ModelMessage;
};

export async function routeChatRequest(
  params: ChatRequestContext,
): Promise<void> {
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

  conversation.chatHistory.push(newMessage);

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
  };

  sendAiChatMessageSendEvent({
    projectId,
    userId,
    chatId,
    provider: aiConfig.provider,
  });

  // AI SDKv5 uses SSE, so we need to hijack the response and send the SSE headers
  await fastifyReply.hijack();
  serverResponse.writeHead(200, {
    'x-vercel-ai-ui-message-stream': 'v1',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const heartbeat = startSSEHeartbeat(serverResponse);

  try {
    if (isCodeGenerationRequest) {
      logger.debug('Using code generation flow');
      await handleCodeGenerationRequest(generationRequestParams);
    } else {
      logger.debug('Using normal conversation flow');
      await handleUserMessage(generationRequestParams);
    }
  } finally {
    clearInterval(heartbeat);
  }
}

function isResponseOpen(res: ServerResponse): boolean {
  return !res.writableEnded && !res.writableFinished && !res.destroyed;
}

function startSSEHeartbeat(
  res: ServerResponse,
  intervalMs = 15000,
): NodeJS.Timeout {
  const heartbeat = setInterval(() => {
    if (isResponseOpen(res)) {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    } else {
      clearInterval(heartbeat);
    }
  }, intervalMs);

  return heartbeat;
}
