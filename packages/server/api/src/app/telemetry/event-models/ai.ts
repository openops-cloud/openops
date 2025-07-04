import { AiProviderEnum, McpConfig } from '@openops/shared';
import { telemetry } from '../telemetry';
export type AiBase = {
  projectId: string;
  userId: string;
};

export type AiConfigBase = AiBase & {
  id: string;
};

export type AiChatBase = AiBase & {
  chatId: string;
};

export enum AiEventName {
  AI_CONFIG_SAVED = 'ai_config_saved',
  AI_CONFIG_DELETED = 'ai_config_deleted',
  AI_CHAT_FAILURE = 'ai_chat_failure',
  AI_CHAT_SEND_MESSAGE = 'ai_chat_send_message',
  MCP_CONFIG_SAVED = 'mcp_config_saved',
  MCP_CONFIG_DELETED = 'mcp_config_deleted',
}

export function sendAiConfigSavedEvent(
  params: AiConfigBase & {
    provider: string;
    enabled: boolean;
  },
): void {
  telemetry.trackEvent({
    name: AiEventName.AI_CONFIG_SAVED,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      id: params.id,
      provider: params.provider,
      enabled: params.enabled.toString(),
    },
  });
}

export function sendAiConfigDeletedEvent(params: AiConfigBase): void {
  telemetry.trackEvent({
    name: AiEventName.AI_CONFIG_DELETED,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      id: params.id,
    },
  });
}

export function sendAiChatFailureEvent(
  params: AiChatBase & {
    errorMessage: string;
    model: string;
    provider: string;
  },
): void {
  let model = params.model;
  if (params.provider === AiProviderEnum.AZURE_OPENAI) {
    model = 'custom';
  }

  telemetry.trackEvent({
    name: AiEventName.AI_CHAT_FAILURE,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      chatId: params.chatId,
      provider: params.provider,
      model,
      errorMessage: params.errorMessage,
    },
  });
}

export function sendAiChatMessageSendEvent(
  params: AiChatBase & { provider: string },
): void {
  telemetry.trackEvent({
    name: AiEventName.AI_CHAT_SEND_MESSAGE,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      chatId: params.chatId,
      provider: params.provider,
    },
  });
}

export function sendMcpConfigSavedEvent(
  params: McpConfig & { userId: string },
): void {
  telemetry.trackEvent({
    name: AiEventName.MCP_CONFIG_SAVED,
    labels: {
      name: params.name,
      config: JSON.stringify(params.config),
      projectId: params.projectId,
      id: params.id,
      userId: params.userId,
    },
  });
}

export function sendMcpConfigDeletedEvent(
  params: Pick<McpConfig, 'id' | 'projectId'> & { userId: string },
): void {
  telemetry.trackEvent({
    name: AiEventName.MCP_CONFIG_DELETED,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      id: params.id,
    },
  });
}
