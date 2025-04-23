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
    } else {
      existing = await repo().findOneBy({
        projectId,
        provider: request.provider,
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
      delete aiConfig.apiKey;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await repo().upsert(aiConfig as any, ['projectId', 'provider']);

    const config = await repo().findOneByOrFail({
      projectId,
      provider: request.provider,
    });
    return {
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    };
  },

  async list(projectId: string): Promise<AiConfigRedacted[]> {
    const configs = await repo().findBy({
      projectId,
    });

    const redactedConfigs = configs.map((config) => ({
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    }));

    return redactedConfigs;
  },

  async get(
    params: { projectId: string; id: string },
    redacted = true,
  ): Promise<AiConfigRedacted | AiConfig | undefined> {
    const { projectId, id } = params;
    const config = await repo().findOneBy({
      id,
      projectId,
    });

    if (isNil(config)) {
      return undefined;
    }

    return redacted ? { ...config, apiKey: AiApiKeyRedactionMessage } : config;
  },

  async getActiveConfig(
    projectId: string,
    redacted = true,
  ): Promise<AiConfigRedacted | AiConfig | undefined> {
    const config = await repo().findOneBy({
      projectId,
      enabled: true,
    });

    if (isNil(config)) {
      return undefined;
    }

    return redacted ? { ...config, apiKey: AiApiKeyRedactionMessage } : config;
  },
};
