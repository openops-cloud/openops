import { getAiProviderLanguageModel } from '@openops/common';
import {
  cacheWrapper,
  distributedLock,
  encryptUtils,
  hashUtils,
} from '@openops/server-shared';
import { AiConfig, ApplicationError, ErrorCode } from '@openops/shared';
import { CoreMessage, LanguageModel, generateText } from 'ai';
import { aiConfigService } from '../config/ai-config.service';
import { MessageWithMergedToolResults } from './types';
import { mergeToolResultsIntoMessages } from './utils';

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

export type MCPChatContext = {
  chatId?: string;
  workflowId?: string;
  blockName?: string;
  stepId?: string;
  actionName?: string;
  chatName?: string;
  userMessageCount?: number;
};

export const incrementUserMessageCount = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<MCPChatContext> => {
  const context = (await getChatContext(chatId, userId, projectId)) || {};
  context.userMessageCount = (context.userMessageCount || 0) + 1;
  await createChatContext(chatId, userId, projectId, context);
  return context;
};

export async function generateChatName(
  messages: CoreMessage[],
  projectId: string,
): Promise<string> {
  const { languageModel } = await getLLMConfig(projectId);
  const prompt: CoreMessage[] = [
    {
      role: 'assistant',
      content: `
      You are an AI assistant on the OpenOps platform, where users interact about FinOps, cloud providers (AWS, Azure, GCP), OpenOps features, and workflow automation.
      Given the following conversation, suggest a short, descriptive name (max five words) that best summarizes the main topic, question, or action discussed in this chat. 
      The name should be specific (not generic like "Chat" or "Conversation"), and reflect the user's intent (e.g., "AWS Cost Optimization", "Create Budget Workflow", "OpenOps Integration Help").
      Limit the name to five words or less.
      Respond with only the name.
      `,
    } as const,
    ...messages,
  ];
  const response = await generateText({
    model: languageModel,
    messages: prompt,
  });
  return response.text.trim();
}

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

/**
 * Get chat history with tool results merged into assistant messages.
 */
export const getChatHistoryWithMergedTools = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<MessageWithMergedToolResults[]> => {
  const messages = await getChatHistory(chatId, userId, projectId);
  return mergeToolResultsIntoMessages(messages);
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
): Promise<{ chatContext: MCPChatContext; messages: CoreMessage[] }> {
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

  const messages = await getChatHistory(chatId, userId, projectId);

  return { chatContext, messages };
}
