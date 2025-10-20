import {
  AiAuth,
  getAiModelFromConnection,
  getAiProviderLanguageModel,
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
  removeConnectionBrackets,
} from '@openops/shared';
import { LanguageModel, ModelMessage, UIMessage, generateText } from 'ai';
import { appConnectionService } from '../../app-connection/app-connection-service/app-connection-service';
import { aiConfigService } from '../config/ai-config.service';
import { loadPrompt } from './prompts.service';
import { Conversation } from './types';
import { mergeToolResultsIntoMessages } from './utils';

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
  provider?: string;
  model?: string;
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
  const chatExpireTime = system.getNumberOrThrow(
    AppSystemProp.LLM_CHAT_EXPIRE_TIME_SECONDS,
  );
  await cacheWrapper.setSerializedObject(
    chatContextKey(chatId, userId, projectId),
    context,
    chatExpireTime,
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
  await cacheWrapper.deleteKey(chatHistoryKey(chatId, userId, projectId));
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
