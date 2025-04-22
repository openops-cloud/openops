import { AiProviderEnum } from '@openops/common';
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

    const providerValues = Object.values(AiProviderEnum);
    if (!providerValues.includes(request.provider as AiProviderEnum)) {
      throw new Error(`Invalid AI provider: ${request.provider}`);
    }

    const existing = await repo().findOneBy({
      projectId,
      provider: request.provider,
    });

    const aiConfig: Partial<AiConfig> = {
      ...request,
      projectId,
      id: request.id ?? existing?.id ?? openOpsId(),
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

    return repo().findOneByOrFail({
      projectId,
      provider: request.provider,
    });
  },
};
