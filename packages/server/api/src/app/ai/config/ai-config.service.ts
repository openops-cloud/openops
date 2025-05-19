import {
  AiConfig,
  isNil,
  openOpsId,
  SaveAiConfigRequest,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import {
  sendAiConfigDeletedEvent,
  sendAiConfigSavedEvent,
} from '../../telemetry/event-models/ai';
import { AiApiKeyRedactionMessage, AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

type AiConfigRedacted = Omit<AiConfig, 'apiKey'> & {
  apiKey: typeof AiApiKeyRedactionMessage;
};

function redactApiKey(config: AiConfig): AiConfigRedacted {
  return {
    ...config,
    apiKey: AiApiKeyRedactionMessage,
  };
}

export const aiConfigService = {
  async save(params: {
    userId: string;
    projectId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfigRedacted> {
    const { projectId, request } = params;

    const existing = request.id
      ? await repo().findOneBy({ id: request.id, projectId })
      : null;

    const encryptedApiKey =
      request.apiKey !== AiApiKeyRedactionMessage
        ? JSON.stringify(encryptUtils.encryptString(request.apiKey))
        : existing?.apiKey;

    const aiConfig: Partial<AiConfig> = {
      ...request,
      id: request?.id ?? openOpsId(),
      projectId,
      created: existing?.created ?? new Date().toISOString(),
      updated: new Date().toISOString(),
      apiKey: encryptedApiKey,
    };

    const config = await repo().save(aiConfig);

    sendAiConfigSavedEvent({
      id: config.id,
      userId: params.userId,
      projectId: params.projectId,
      provider: config.provider,
      enabled: config.enabled ?? false,
    });

    return redactApiKey(config);
  },

  async list(projectId: string): Promise<AiConfigRedacted[]> {
    const configs = await repo().findBy({ projectId });
    return configs.map(redactApiKey);
  },

  async get(params: {
    projectId: string;
    id: string;
  }): Promise<AiConfigRedacted | undefined> {
    const config = await getOneBy({
      id: params.id,
      projectId: params.projectId,
    });
    return config ? redactApiKey(config) : undefined;
  },

  async getWithApiKey(params: {
    projectId: string;
    id: string;
  }): Promise<AiConfig | undefined> {
    return getOneBy({ id: params.id, projectId: params.projectId });
  },

  async getActiveConfig(
    projectId: string,
  ): Promise<AiConfigRedacted | undefined> {
    const config = await getOneBy({ projectId, enabled: true });
    return config ? redactApiKey(config) : undefined;
  },

  async getActiveConfigWithApiKey(
    projectId: string,
  ): Promise<AiConfig | undefined> {
    return getOneBy({ projectId, enabled: true });
  },

  async delete(params: {
    projectId: string;
    id: string;
    userId: string;
  }): Promise<void> {
    const { projectId, id } = params;

    const config = await repo().findOneBy({ id, projectId });
    if (!config) {
      throw new Error('Config not found or does not belong to this project');
    }

    sendAiConfigDeletedEvent({
      userId: params.userId,
      projectId: params.projectId,
      id: params.id,
    });

    await repo().delete({ id });
  },
};

async function getOneBy(
  where: Partial<Pick<AiConfig, 'id' | 'projectId' | 'enabled'>>,
): Promise<AiConfig | AiConfigRedacted | undefined> {
  const config = await repo().findOneBy(where);

  if (isNil(config)) {
    return undefined;
  }

  return config;
}
