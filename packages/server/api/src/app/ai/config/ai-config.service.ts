import {
  AiConfig,
  isNil,
  openOpsId,
  SaveAiConfigRequest,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { AiApiKeyRedactionMessage, AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

type AiConfigRedacted = Omit<AiConfig, 'apiKey'> & {
  apiKey: typeof AiApiKeyRedactionMessage;
};

type AiConfigModel<T extends boolean> = T extends true
  ? AiConfigRedacted
  : AiConfig;

function redactApiKey(config: AiConfig): AiConfigRedacted {
  return {
    ...config,
    apiKey: AiApiKeyRedactionMessage,
  };
}

export const aiConfigService = {
  async save(params: {
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

    return redactApiKey(config);
  },

  async list(projectId: string): Promise<AiConfigRedacted[]> {
    const configs = await repo().findBy({ projectId });
    return configs.map(redactApiKey);
  },

  async get<T extends boolean>(
    params: { projectId: string; id: string },
    redacted: T = true as T,
  ): Promise<AiConfigModel<T> | undefined> {
    const { projectId, id } = params;
    const config = await repo().findOneBy({ id, projectId });

    if (isNil(config)) {
      return undefined;
    }

    return redacted ? redactApiKey(config) : (config as AiConfigModel<T>);
  },

  async getActiveConfig<T extends boolean>(
    projectId: string,
    redacted: T = true as T,
  ): Promise<AiConfigModel<T> | undefined> {
    const config = await repo().findOneBy({
      projectId,
      enabled: true,
    });

    if (isNil(config)) {
      return undefined;
    }

    return redacted ? redactApiKey(config) : (config as AiConfigModel<T>);
  },

  async delete(params: { projectId: string; id: string }): Promise<void> {
    const { projectId, id } = params;

    const config = await repo().findOneBy({ id, projectId });
    if (!config) {
      throw new Error('Config not found or does not belong to this project');
    }

    await repo().delete({ id });
  },
};
