import {
  cacheWrapper,
  distributedLock,
  hashUtils,
  logger,
} from '@openops/server-shared';
import { CoreMessage } from 'ai';
import { randomUUID } from 'node:crypto';

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

export const ACTIVE_STREAM_SUFFIX = 'active-stream';
const activeStreamKey = (chatId: string): string => {
  return `${chatId}:${ACTIVE_STREAM_SUFFIX}`;
};

export const STREAM_EXPIRE_TIME = 300;

export type StreamData = {
  chatId: string;
  userId: string;
  timestamp: number;
  requestId?: string;
  abortControllerId?: string;
};

export const setActiveStream = async (
  chatId: string,
  streamData: StreamData,
): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    activeStreamKey(chatId),
    streamData,
    STREAM_EXPIRE_TIME,
  );
};

const getActiveStream = async (chatId: string): Promise<StreamData | null> => {
  return cacheWrapper.getSerializedObject(activeStreamKey(chatId));
};

export const deleteActiveStream = async (chatId: string): Promise<void> => {
  await cacheWrapper.deleteKey(activeStreamKey(chatId));
};

const abortControllerRegistry = new Map<string, AbortController>();

const getAbortController = (
  abortControllerId: string,
): AbortController | undefined => {
  return abortControllerRegistry.get(abortControllerId);
};

export const cancelActiveStream = async (chatId: string): Promise<void> => {
  const streamData = await getActiveStream(chatId);
  if (streamData && streamData.abortControllerId) {
    const abortController = getAbortController(streamData.abortControllerId);
    if (abortController) {
      logger.debug('Aborting stream controller found in this instance', {
        chatId,
        abortControllerId: streamData.abortControllerId,
      });
      abortController.abort();
    } else {
      logger.debug(
        'Abort controller not found in this instance, marking for cancellation',
        {
          chatId,
          abortControllerId: streamData.abortControllerId,
        },
      );
    }

    await deleteActiveStream(chatId);
  }
};

export const setupStreamCancellation = async (
  chatId: string,
  userId: string,
  requestId: string,
): Promise<AbortController> => {
  const abortController = new AbortController();
  const abortControllerId = `${chatId}-${randomUUID()}`;

  abortControllerRegistry.set(abortControllerId, abortController);

  const streamData: StreamData = {
    chatId,
    userId,
    timestamp: Date.now(),
    requestId,
    abortControllerId,
  };

  const existingStream = await getActiveStream(chatId);
  if (existingStream) {
    logger.debug('Overwriting existing stream', {
      chatId,
      existingUserId: existingStream.userId,
      newUserId: streamData.userId,
    });
  }

  await setActiveStream(chatId, streamData);

  const cleanup = async (): Promise<void> => {
    try {
      await deleteActiveStream(chatId);
      abortControllerRegistry.delete(abortControllerId);
    } catch (error) {
      logger.error('Failed to cleanup stream', {
        chatId,
        error,
      });
    }
  };

  abortController.signal.addEventListener('abort', () => void cleanup());

  return abortController;
};
