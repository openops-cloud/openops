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
    model: string;
    provider: string;
    providerSettings?: string;
    modelSettings?: string;
  },
): void {
  telemetry.trackEvent({
    name: AiEventName.AI_CONFIG_SAVED,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      id: params.id,
      model: params.model,
      provider: params.provider,
      providerSettings: params.providerSettings ?? '',
      modelSettings: params.modelSettings ?? '',
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
