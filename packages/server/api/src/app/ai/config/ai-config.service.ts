import {
  AiConfig,
  openOpsId,
  ProjectId,
  SaveAiConfigRequest,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { encryptUtils } from '../../helper/encryption';
import { AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

export const aiConfigService = {
  async upsert(params: {
    projectId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfig> {
    const { projectId, request } = params;

    const existing = await repo().findOneBy({
      projectId,
      provider: request.provider,
    });

    const aiConfig: Partial<AiConfig> = {
      ...request,
      projectId,
      apiKey: JSON.stringify(encryptUtils.encryptString(request.apiKey)),
      id: existing?.id ?? openOpsId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await repo().upsert(aiConfig as any, ['projectId', 'provider']);

    return repo().findOneByOrFail({
      projectId,
      provider: request.provider,
    });
  },
  async getAiConfig(params: GetOneParams): Promise<AiConfig | null> {
    const { projectId } = params;

    return repo().findOneBy({
      projectId,
      enabled: true,
    });
  },
};

type GetOneParams = {
  projectId: ProjectId;
};
