import { telemetry } from '../telemetry';

export type AiBase = {
  projectId: string;
  userId: string;
};

export type AiConfigBase = AiBase & {
  id: string;
};

export enum AiEventName {
  AI_CONFIG_SAVED = 'ai_config_saved',
  AI_CONFIG_DELETED = 'ai_config_deleted',
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
