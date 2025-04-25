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
  async upsert(params: {
    projectId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfigRedacted> {
    const { projectId, request } = params;
    let existing: AiConfig | null = null;

    if (request.id) {
      existing = await repo().findOneBy({
        id: request.id,
        projectId,
      });
    }

    const aiConfig: Partial<AiConfig> = {
      ...request,
      projectId,
      id: existing?.id ?? openOpsId(),
      created: existing?.created ?? new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    if (request.apiKey !== AiApiKeyRedactionMessage) {
      aiConfig.apiKey = JSON.stringify(
        encryptUtils.encryptString(request.apiKey),
      );
    } else {
      aiConfig.apiKey = existing?.apiKey;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await repo().upsert(aiConfig as any, ['id']);

    const config = await repo().findOneByOrFail({
      projectId,
      provider: request.provider,
    });

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
