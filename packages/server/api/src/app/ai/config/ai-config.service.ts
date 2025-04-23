import { AiConfig, openOpsId, SaveAiConfigRequest } from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { AiApiKeyRedactionMessage, AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

export const aiConfigService = {
  async upsert(params: {
    projectId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfig> {
    const { projectId, request } = params;
    let existing: AiConfig | null = null;

    if (request.id) {
      existing = await this.get({ projectId, id: request.id });
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

  async list(projectId: string): Promise<AiConfig[]> {
    const configs = await repo().findBy({
      projectId,
    });

    const redactedConfigs = configs.map((config) => ({
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    }));

    return redactedConfigs;
  },

  async get(params: { projectId: string; id: string }): Promise<AiConfig> {
    const { projectId, id } = params;
    const config = await repo().findOneByOrFail({
      id,
      projectId,
    });

    return {
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    };
  },

  async getActiveConfig(projectId: string): Promise<AiConfig> {
    const config = await repo().findOneByOrFail({
      projectId,
      enabled: true,
    });

    return {
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    };
  },
};
