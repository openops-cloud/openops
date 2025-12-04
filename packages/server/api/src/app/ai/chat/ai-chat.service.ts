import {
  AiAuth,
  getAiModelFromConnection,
  getAiProviderLanguageModel,
  isLLMTelemetryEnabled,
} from '@openops/common';
import {
  AppSystemProp,
  cacheWrapper,
  hashUtils,
  system,
} from '@openops/server-shared';
import {
  AiConfigParsed,
  ApplicationError,
  CustomAuthConnectionValue,
  ErrorCode,
  GeneratedChatName,
  isEmpty,
  removeConnectionBrackets,
} from '@openops/shared';
import { generateObject, LanguageModel, ModelMessage, UIMessage } from 'ai';
import { z } from 'zod';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { aiConfigService } from '../config/ai-config.service';
import { loadPrompt } from './prompts.service';
import { Conversation } from './types';
import {
  mergeToolResultsIntoMessages,
  sanitizeMessagesForChatName,
} from './utils';

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

const chatToolsKey = (
  chatId: string,
  userId: string,
  projectId: string,
): string => {
  return `${projectId}:${userId}:${chatId}:tools`;
};

export type MCPChatContext = {
  chatId?: string;
  workflowId?: string;
  blockName?: string;
  stepId?: string;
  actionName?: string;
  chatName?: string;
  provider?: string;
  model?: string;
};

type ChatSummary = { chatId: string; chatName: string };

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

const generatedChatNameSchema = z.object({
  name: z
    .string()
    .max(100)
    .nullable()
    .describe('Conversation name or null if it was not generated'),
  isGenerated: z.boolean().describe('Whether the name was generated or not'),
});

export async function generateChatName(
  messages: ModelMessage[],
  projectId: string,
): Promise<GeneratedChatName> {
  const { languageModel, aiConfig } = await getLLMConfig(projectId);
  const systemPrompt = await loadPrompt('chat-name.txt');
  if (!systemPrompt.trim()) {
    throw new Error('Failed to load prompt to generate the chat name.');
  }

  const sanitizedMessages: ModelMessage[] =
    sanitizeMessagesForChatName(messages);

  if (isEmpty(sanitizedMessages)) {
    return { name: null, isGenerated: false };
  }

  const result = await generateObject({
    model: languageModel,
    system: systemPrompt,
    messages: sanitizedMessages,
    schema: generatedChatNameSchema,
    ...aiConfig.modelSettings,
    experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    maxRetries: 2,
  });

  return result.object;
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

const userChatsIndexKey = (userId: string, projectId: string): string => {
  return `${projectId}:${userId}:chats`;
};

export const createChatContext = async (
  chatId: string,
  userId: string,
  projectId: string,
  context: MCPChatContext,
): Promise<void> => {
  const chatExpireTime = system.getNumberOrThrow(
    AppSystemProp.LLM_CHAT_EXPIRE_TIME_SECONDS,
  );
  await cacheWrapper.setSerializedObject(
    chatContextKey(chatId, userId, projectId),
    context,
    chatExpireTime,
  );
  const indexKey = userChatsIndexKey(userId, projectId);
  await cacheWrapper.addToSet(indexKey, chatId);
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
): Promise<ModelMessage[]> => {
  const messages = await cacheWrapper.getSerializedObject<ModelMessage[]>(
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
): Promise<Array<Omit<UIMessage, 'id'>>> => {
  const messages = await getChatHistory(chatId, userId, projectId);
  return mergeToolResultsIntoMessages(messages);
};

export const getAllChats = async (
  userId: string,
  projectId: string,
): Promise<{ chatId: string; chatName: string }[]> => {
  const indexKey = userChatsIndexKey(userId, projectId);
  const chatIds = await cacheWrapper.getSetMembers(indexKey);

  if (chatIds.length === 0) {
    return [];
  }

  const chatsOrNull = await Promise.all(
    chatIds.map(async (chatId): Promise<ChatSummary | null> => {
      const context = await getChatContext(chatId, userId, projectId);
      if (!context?.chatName) {
        return null;
      }
      return {
        chatId,
        chatName: context.chatName,
      };
    }),
  );

  return chatsOrNull.filter((chat): chat is ChatSummary => chat !== null);
};

export const saveChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
  messages: ModelMessage[],
): Promise<void> => {
  const chatExpireTime = system.getNumberOrThrow(
    AppSystemProp.LLM_CHAT_EXPIRE_TIME_SECONDS,
  );
  await cacheWrapper.setSerializedObject(
    chatHistoryKey(chatId, userId, projectId),
    messages,
    chatExpireTime,
  );
};

export const deleteChatHistory = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<void> => {
  const indexKey = userChatsIndexKey(userId, projectId);
  await Promise.all([
    cacheWrapper.deleteKey(chatHistoryKey(chatId, userId, projectId)),
    cacheWrapper.deleteKey(chatToolsKey(chatId, userId, projectId)),
    cacheWrapper.deleteKey(chatContextKey(chatId, userId, projectId)),
    cacheWrapper.removeFromSet(indexKey, chatId),
  ]);
};

/**
 * Save selected tool names for a chat session.
 * This is used to maintain an append-only list of tools that have been
 * selected throughout the conversation to prevent LLM hallucinations.
 */
export const saveChatTools = async (
  chatId: string,
  userId: string,
  projectId: string,
  toolNames: string[],
): Promise<void> => {
  const chatExpireTime = system.getNumberOrThrow(
    AppSystemProp.LLM_CHAT_EXPIRE_TIME_SECONDS,
  );
  await cacheWrapper.setSerializedObject(
    chatToolsKey(chatId, userId, projectId),
    toolNames,
    chatExpireTime,
  );
};

/**
 * Get the list of tool names that have been selected for this chat.
 * Returns empty array if no tools have been saved yet.
 */
export const getChatTools = async (
  chatId: string,
  userId: string,
  projectId: string,
): Promise<string[]> => {
  const toolNames = await cacheWrapper.getSerializedObject<string[]>(
    chatToolsKey(chatId, userId, projectId),
  );
  return toolNames ?? [];
};

export async function getLLMConfig(
  projectId: string,
  contextModel?: string,
): Promise<{ aiConfig: AiConfigParsed; languageModel: LanguageModel }> {
  const aiConfig = await aiConfigService.getActiveConfig(projectId);
  const connectionName = removeConnectionBrackets(aiConfig?.connection);
  if (!aiConfig || !connectionName) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'No active AI configuration found for the project.',
        entityType: 'AI Configuration',
        entityId: projectId,
      },
    });
  }

  const connection = (
    await appConnectionService.getOne({
      projectId,
      name: connectionName,
    })
  )?.value as CustomAuthConnectionValue;

  const connectionProps = connection.props as AiAuth;

  const model =
    getAiModelFromConnection(
      connectionProps.model,
      connectionProps.customModel,
    ) ?? '';

  const initialProviderSettings = connectionProps?.providerSettings
    ? connectionProps?.providerSettings
    : {};

  const providerSettings = {
    ...initialProviderSettings,
    baseURL: connectionProps?.baseURL,
  };

  const languageModel = await getAiProviderLanguageModel({
    model: contextModel ?? model,
    apiKey: connectionProps?.apiKey,
    provider: connectionProps.provider,
    providerSettings,
  });

  const aiConfigParsed: AiConfigParsed = {
    model: contextModel ?? model,
    provider: connectionProps.provider,
    apiKey: connectionProps?.apiKey,
    providerSettings,
    modelSettings: connectionProps?.modelSettings,
  };

  return { aiConfig: aiConfigParsed, languageModel };
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
