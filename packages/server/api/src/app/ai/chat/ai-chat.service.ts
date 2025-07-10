import {
  cacheWrapper,
  distributedLock,
  hashUtils,
} from '@openops/server-shared';
import { CoreMessage } from 'ai';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;
const LOCK_EXPIRE_TIME = 30000;

const chatContextKey = (
  chatId: string,
  userId: string,
  projectId: string,
): string => {
  return `${projectId}:${userId}:${chatId}:context`;
};

const chatHistoryKey = (
  chatId: string,
  userId: string,
  projectId: string,
): string => {
  return `${projectId}:${userId}:${chatId}:history`;
};

const chatHistoryContextKey = (
  chatId: string,
  userId: string,
  projectId: string,
): string => {
  return `${projectId}:${userId}:${chatId}:context:history`;
};

export type MCPChatContext = {
  chatId?: string;
  workflowId?: string;
  blockName?: string;
  stepName?: string;
  actionName?: string;
  name?: string;
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
  userId: string,
  projectId: string,
  context: ChatContext | MCPChatContext,
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatContextKey(chatId, userId, projectId),
    context,
    DEFAULT_EXPIRE_TIME,
  );
};

export const getChatContext = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<ChatContext | null> => {
  return cacheWrapper.getSerializedObject(
    chatContextKey(chatId, userId, projectId),
  );
};

export const getChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    chatHistoryKey(chatId, userId, projectId),
  );

  return messages ?? [];
};

export const saveChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
  messages: CoreMessage[],
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatHistoryKey(chatId, userId, projectId),
    messages,
    DEFAULT_EXPIRE_TIME,
  );
};

export const appendMessagesToChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
  messages: CoreMessage[],
): Promise<void> => {
  const chatLock = await distributedLock.acquireLock({
    key: `lock:${chatHistoryKey(chatId, userId, projectId)}`,
    timeout: LOCK_EXPIRE_TIME,
  });

  try {
    const existingMessages = await getChatHistory(chatId, userId, projectId);

    existingMessages.push(...messages);

    await saveChatHistory(chatId, userId, projectId, existingMessages);
  } finally {
    await chatLock.release();
  }
};

export const deleteChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<void> => {
  await cacheWrapper.deleteKey(chatHistoryKey(chatId, userId, projectId));
};

export const getChatHistoryContext = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    chatHistoryContextKey(chatId, userId, projectId),
  );

  return messages ?? [];
};

export const saveChatHistoryContext = async (
  chatId: string,
  userId: string,
  projectId: string,
  messages: CoreMessage[],
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatHistoryContextKey(chatId, userId, projectId),
    messages,
    DEFAULT_EXPIRE_TIME,
  );
};

export async function appendMessagesToChatHistoryContext(
  chatId: string,
  userId: string,
  projectId: string,
  newMessages: CoreMessage[],
): Promise<CoreMessage[]> {
  const historyLock = await distributedLock.acquireLock({
    key: `lock:${chatHistoryContextKey(chatId, userId, projectId)}`,
    timeout: LOCK_EXPIRE_TIME,
  });

  try {
    const existingMessages = await getChatHistoryContext(
      chatId,
      userId,
      projectId,
    );

    existingMessages.push(...newMessages);

    await saveChatHistoryContext(chatId, userId, projectId, existingMessages);

    return existingMessages;
  } finally {
    await historyLock.release();
  }
}

export const deleteChatHistoryContext = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<void> => {
  await cacheWrapper.deleteKey(
    chatHistoryContextKey(chatId, userId, projectId),
  );
};

export type ChatInfo = {
  chatId: string;
  context: MCPChatContext | null;
};

export const getAllChatsForUserAndProject = async (
  userId: string,
  projectId: string,
): Promise<ChatInfo[]> => {
  const pattern = `${projectId}:${userId}:*:context`;
  const contextKeys = await cacheWrapper.getKeysByPattern(pattern);

  const chats: ChatInfo[] = [];

  for (const contextKey of contextKeys) {
    const parts = contextKey.split(':');
    if (parts.length >= 3) {
      const chatId = parts[2];

      const context = await getChatContext(chatId, userId, projectId);

      chats.push({
        chatId,
        context,
      });
    }
  }

  return chats;
};
