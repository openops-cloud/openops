import { AiProviderEnum, getAiProvider } from '@openops/common';
import { cacheWrapper, hashUtils, logger } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { CoreMessage, LanguageModelV1 } from 'ai';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;

const chatContextKey = (chatId: string): string => {
  return `${chatId}:context`;
};

const chatHistoryKey = (chatId: string): string => {
  return `${chatId}:history`;
};

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
}): string => {
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

export const getLanguageModel = async (
  aiConfig: AiConfig,
): Promise<LanguageModelV1 | null> => {
  try {
    const aiProvider = getAiProvider(aiConfig.provider as AiProviderEnum);

    return aiProvider.createLanguageModel({
      apiKey: aiConfig.apiKey, // Decrypted API key
      model: aiConfig.model,
      baseUrl: aiConfig.providerSettings?.baseUrl as string | undefined,
    });
  } catch (error) {
    logger.error('Error getting AI provider.', {
      provider: aiConfig.provider,
      error,
    });
    return null;
  }
};
