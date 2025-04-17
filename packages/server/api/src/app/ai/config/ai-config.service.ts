import { AiConfig, openOpsId, SaveAiConfigRequest } from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

export const aiConfigService = {
  async upsert(params: {
    projectId: string;
    userId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfig> {
    const { projectId, request } = params;

    const existing = await repo().findOneBy({
      projectId,
      provider: request.provider,
    });

    const aiConfig: Partial<AiConfig> = {
      ...request,
      id: existing?.id ?? openOpsId(),
      projectId,
    };

    await repo().upsert(aiConfig, ['projectId', 'provider']);

    return repo().findOneByOrFail({
      projectId,
      provider: request.provider,
    });
  },
};
