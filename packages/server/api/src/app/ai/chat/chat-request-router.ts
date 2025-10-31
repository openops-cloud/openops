import { logger } from '@openops/server-shared';
import {
  CODE_BLOCK_NAME,
  NewMessageRequest,
  Principal,
  SSE_HEARTBEAT_INTERVAL_MS,
} from '@openops/shared';
import { ModelMessage } from 'ai';
import { FastifyInstance, FastifyReply } from 'fastify';
import { IncomingMessage, ServerResponse } from 'node:http';
import { sendAiChatMessageSendEvent } from '../../telemetry/event-models';
import {
  createChatContext,
  getConversation,
  getLLMConfig,
} from './ai-chat.service';
import { handleCodeGenerationRequest } from './code-generation-handler';
import { handleUserMessage } from './user-message-handler';

export type ChatRequestContext = {
  request: {
    body: NewMessageRequest;
    principal: Principal;
    headers: {
      authorization?: string;
    };
    raw: IncomingMessage;
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

  const controller = new AbortController();
  const abortSignal = controller.signal;

  serverResponse.on('close', () => {
    controller.abort();
  });

  const chatId = request.body.chatId;
  const userId = request.principal.id;
  const projectId = request.principal.projectId;
  const authToken = request.headers.authorization?.replace('Bearer ', '') ?? '';

  const conversation = await getConversation(chatId, userId, projectId);
  const isCodeGenerationRequest =
    conversation.chatContext?.blockName === CODE_BLOCK_NAME;

  const currentCtx = conversation.chatContext;

  const { aiConfig } = await getLLMConfig(projectId);

  let currentModel = currentCtx?.model ?? aiConfig.model;

  if (
    !currentCtx?.provider ||
    !currentCtx?.model ||
    currentCtx?.provider !== aiConfig.provider
  ) {
    currentModel = aiConfig.model;
    await createChatContext(chatId, userId, projectId, {
      ...currentCtx,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });
  }

  const { languageModel } = await getLLMConfig(projectId, currentModel);

  const updatedConfig = {
    ...aiConfig,
    model: currentModel,
  };

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
    aiConfig: updatedConfig,
    languageModel,
    additionalContext: request.body.additionalContext,
    frontendTools: request.body.tools || {},
    abortSignal,
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
  serverResponse.write(': connection established\n\n');

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
  intervalMs = SSE_HEARTBEAT_INTERVAL_MS,
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
