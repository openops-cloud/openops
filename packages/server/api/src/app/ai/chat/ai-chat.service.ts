import { getAiProviderLanguageModel } from '@openops/common';
import {
  cacheWrapper,
  distributedLock,
  encryptUtils,
  hashUtils,
} from '@openops/server-shared';
import { AiConfig, ApplicationError, ErrorCode } from '@openops/shared';
import { CoreMessage, LanguageModel } from 'ai';
import { aiConfigService } from '../config/ai-config.service';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;
const LOCK_EXPIRE_TIME = 30000;

const chatContextKey = (chatId: string): string => {
  return `${chatId}:context`;
};

const chatHistoryKey = (chatId: string): string => {
  return `${chatId}:history`;
};

const chatHistoryContextKey = (chatId: string): string => {
  return `${chatId}:context:history`;
};

export type MCPChatContext = {
  chatId: string;
};

export type ChatContext = {
  workflowId: string;
  blockName: string;
  stepName: string;
  actionName: string;
};

export const generateChatId = (params: {
  workflowId: string;
  blockName: string;
  stepName: string;
  actionName: string;
  userId: string;
}): string => {
  return hashUtils.hashObject({
    workflowId: params.workflowId,
    blockName: params.blockName,
    stepName: params.stepName,
    actionName: params.actionName,
    userId: params.userId,
  });
};

export const generateChatIdForMCP = (params: {
  chatId: string;
  userId: string;
}): string => {
  return hashUtils.hashObject({
    chatId: params.chatId,
    userId: params.userId,
  });
};

export const createChatContext = async (
  chatId: string,
  context: ChatContext | MCPChatContext,
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatContextKey(chatId),
    context,
    DEFAULT_EXPIRE_TIME,
  );
};

export const getChatContext = async (
  chatId: string,
): Promise<ChatContext | null> => {
  return cacheWrapper.getSerializedObject(chatContextKey(chatId));
};

export const getChatHistory = async (
  chatId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    chatHistoryKey(chatId),
  );

  return messages ?? [];
};

export const saveChatHistory = async (
  chatId: string,
  messages: CoreMessage[],
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatHistoryKey(chatId),
    messages,
    DEFAULT_EXPIRE_TIME,
  );
};

export const appendMessagesToChatHistory = async (
  chatId: string,
  messages: CoreMessage[],
): Promise<void> => {
  const chatLock = await distributedLock.acquireLock({
    key: `lock:${chatHistoryKey(chatId)}`,
    timeout: LOCK_EXPIRE_TIME,
  });

  try {
    const existingMessages = await getChatHistory(chatId);

    existingMessages.push(...messages);

    await saveChatHistory(chatId, existingMessages);
  } finally {
    await chatLock.release();
  }
};

export const deleteChatHistory = async (chatId: string): Promise<void> => {
  await cacheWrapper.deleteKey(chatHistoryKey(chatId));
};

export const getChatHistoryContext = async (
  chatId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    chatHistoryContextKey(chatId),
  );

  return messages ?? [];
};

export const saveChatHistoryContext = async (
  chatId: string,
  messages: CoreMessage[],
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatHistoryContextKey(chatId),
    messages,
    DEFAULT_EXPIRE_TIME,
  );
};

export async function appendMessagesToChatHistoryContext(
  chatId: string,
  newMessages: CoreMessage[],
): Promise<CoreMessage[]> {
  const historyLock = await distributedLock.acquireLock({
    key: `lock:${chatHistoryContextKey(chatId)}`,
    timeout: LOCK_EXPIRE_TIME,
  });

  try {
    const existingMessages = await getChatHistoryContext(chatId);

    existingMessages.push(...newMessages);

    await saveChatHistoryContext(chatId, existingMessages);

    return existingMessages;
  } finally {
    await historyLock.release();
  }
}

export const deleteChatHistoryContext = async (
  chatId: string,
): Promise<void> => {
  await cacheWrapper.deleteKey(chatHistoryContextKey(chatId));
};

export async function getLLMConfig(
  projectId: string,
): Promise<{ aiConfig: AiConfig; languageModel: LanguageModel }> {
  const aiConfig = await aiConfigService.getActiveConfigWithApiKey(projectId);
  if (!aiConfig) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'No active AI configuration found for the project.',
        entityType: 'AI Configuration',
        entityId: projectId,
      },
    });
  }

  const apiKey = encryptUtils.decryptString(JSON.parse(aiConfig.apiKey));
  const languageModel = await getAiProviderLanguageModel({
    apiKey,
    model: aiConfig.model,
    provider: aiConfig.provider,
    providerSettings: aiConfig.providerSettings,
  });

  return { aiConfig, languageModel };
}

export async function getConversation(
  chatId: string,
): Promise<{ chatContext: ChatContext; messages: CoreMessage[] }> {
  const chatContext = await getChatContext(chatId);
  if (!chatContext) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'No chat session found for the provided chat ID.',
        entityType: 'Chat Session',
        entityId: chatId,
      },
    });
  }

  const messages = await getChatHistory(chatId);

  return { chatContext, messages };
}
