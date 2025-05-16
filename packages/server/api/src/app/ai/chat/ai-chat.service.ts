import {
  cacheWrapper,
  distributedLock,
  hashUtils,
} from '@openops/server-shared';
import { CoreMessage } from 'ai';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;

const chatContextKey = (chatId: string): string => {
  return `${chatId}:context`;
};

const chatHistoryKey = (chatId: string): string => {
  return `${chatId}:history`;
};

export const summarizedChatHistoryKey = (chatId: string): string => {
  return `${chatId}:llm:history`;
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
    timeout: 10000,
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

export const getSummarizedChatHistory = async (
  chatId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    summarizedChatHistoryKey(chatId),
  );

  return messages ?? [];
};

export async function appendMessagesToSummarizedChatHistory(
  chatId: string,
  newMessages: CoreMessage[],
  summarizeMessages?: (
    existingMessages: CoreMessage[],
  ) => Promise<CoreMessage[]>,
): Promise<CoreMessage[]> {
  const historyLock = await distributedLock.acquireLock({
    key: `lock:${summarizedChatHistoryKey(chatId)}`,
    timeout: 10000,
  });

  const messages: CoreMessage[] = [];
  try {
    let existingMessages = await getSummarizedChatHistory(chatId);

    if (summarizeMessages) {
      existingMessages = await summarizeMessages(existingMessages);
    }

    existingMessages.push(...newMessages);

    await cacheWrapper.setSerializedObject(
      summarizedChatHistoryKey(chatId),
      existingMessages,
      DEFAULT_EXPIRE_TIME,
    );
  } finally {
    await historyLock.release();
  }

  return messages;
}

export const deleteSummarizedChatHistory = async (
  chatId: string,
): Promise<void> => {
  await cacheWrapper.deleteKey(summarizedChatHistoryKey(chatId));
};
