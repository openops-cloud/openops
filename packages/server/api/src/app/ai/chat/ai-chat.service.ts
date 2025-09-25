import { getAiProviderLanguageModel } from '@openops/common';
import { cacheWrapper, encryptUtils, hashUtils } from '@openops/server-shared';
import { AiConfig, ApplicationError, ErrorCode } from '@openops/shared';
import { LanguageModel, ModelMessage, UIMessage, generateText } from 'ai';
import { aiConfigService } from '../config/ai-config.service';
import { loadPrompt } from './prompts.service';
import { Conversation } from './types';

// Chat expiration time is 24 hour
const DEFAULT_EXPIRE_TIME = 86400;

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

export type MCPChatContext = {
  chatId?: string;
  workflowId?: string;
  blockName?: string;
  stepId?: string;
  actionName?: string;
  chatName?: string;
};

export const generateChatId = (
  params: MCPChatContext & {
    userId: string;
  },
): string => {
  return hashUtils.hashObject({
    workflowId: params.workflowId,
    blockName: params.blockName,
    stepId: params.stepId,
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

export async function generateChatName(
  messages: ModelMessage[],
  projectId: string,
): Promise<string> {
  const { languageModel } = await getLLMConfig(projectId);
  const systemPrompt = await loadPrompt('chat-name.txt');
  if (!systemPrompt.trim()) {
    throw new Error('Failed to load prompt to generate the chat name.');
  }
  const prompt: ModelMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    } as const,
    ...messages,
  ];
  const response = await generateText({
    model: languageModel,
    messages: prompt,
    maxRetries: 2,
  });
  return response.text.trim();
}

export const updateChatName = async (
  chatId: string,
  userId: string,
  projectId: string,
  newChatName: string,
): Promise<void> => {
  const chatContext = await getChatContext(chatId, userId, projectId);
  if (!chatContext) {
    throw new Error('Chat context not found');
  }

  const updatedChatContext = { ...chatContext, chatName: newChatName };

  await createChatContext(chatId, userId, projectId, updatedChatContext);
};

export const createChatContext = async (
  chatId: string,
  userId: string,
  projectId: string,
  context: MCPChatContext,
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
): Promise<MCPChatContext | null> => {
  return cacheWrapper.getSerializedObject(
    chatContextKey(chatId, userId, projectId),
  );
};

type ChatHistory = {
  messages: UIMessage[];
  activeStreamId?: string | null;
};

export const getChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<ChatHistory> => {
  const chatHistory = await cacheWrapper.getSerializedObject<ChatHistory>(
    chatHistoryKey(chatId, userId, projectId),
  );

  return {
    messages: chatHistory?.messages ?? [],
    activeStreamId: chatHistory?.activeStreamId ?? null,
  };
};

export const getAllChats = async (
  userId: string,
  projectId: string,
): Promise<{ chatId: string; chatName: string }[]> => {
  const pattern = `${projectId}:${userId}:*:context`;
  const keys = await cacheWrapper.scanKeys(pattern);
  const chats: { chatId: string; chatName: string }[] = [];

  for (const key of keys) {
    const keyParts = key.split(':');
    if (keyParts.length !== 4) {
      continue;
    }
    const longChatId = keyParts[2];

    const context = await cacheWrapper.getSerializedObject<MCPChatContext>(key);

    if (context?.chatName) {
      chats.push({
        chatId: longChatId,
        chatName: context.chatName,
      });
    }
  }

  return chats;
};

export const saveChatHistory = async ({
  chatId,
  userId,
  projectId,
  chatHistory,
}: {
  chatId: string;
  userId: string;
  projectId: string;
  chatHistory: ChatHistory;
}): Promise<void> => {
  await cacheWrapper.setSerializedObject(
    chatHistoryKey(chatId, userId, projectId),
    chatHistory,
    DEFAULT_EXPIRE_TIME,
  );
};

export const deleteChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<void> => {
  await cacheWrapper.deleteKey(chatHistoryKey(chatId, userId, projectId));
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
  userId: string,
  projectId: string,
): Promise<Conversation> {
  const chatContext = await getChatContext(chatId, userId, projectId);
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

  const chatHistory = await getChatHistory(chatId, userId, projectId);

  return { chatContext, chatHistory };
}
