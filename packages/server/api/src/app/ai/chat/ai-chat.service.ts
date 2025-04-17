import { cacheWrapper, hashUtils } from '@openops/server-shared';
import { CoreMessage } from 'ai';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;

export type ChatContext = {
  workflowId: string;
  blockName: string;
  stepName: string;
};

export const generateChatId = (params: {
  workflowId: string;
  blockName: string;
  stepName: string;
  userId: string;
}) => {
  return hashUtils.hashObject({
    workflowId: params.workflowId,
    blockName: params.blockName,
    stepName: params.stepName,
    userId: params.userId,
  });
};

export const createChatContext = async (
  chatId: string,
  context: ChatContext,
): Promise<void> => {
  await cacheWrapper.setSerializedObject(chatId, context, DEFAULT_EXPIRE_TIME);
};

export const getChatHistory = async (
  chatId: string,
): Promise<CoreMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<CoreMessage[]>(
    chatId,
  );

  return messages ?? [];
};
