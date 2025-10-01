import {
  AiConfig,
  isNil,
  openOpsId,
  SaveAiConfigRequest,
} from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import {
  sendAiConfigDeletedEvent,
  sendAiConfigSavedEvent,
} from '../../telemetry/event-models/ai';
import { AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

export const aiConfigService = {
  async save(params: {
    userId: string;
    projectId: string;
    request: SaveAiConfigRequest;
  }): Promise<AiConfig> {
    const { projectId, request } = params;

    const existing = request.id
      ? await repo().findOneBy({ id: request.id, projectId })
      : null;

    const aiConfig: Partial<AiConfig> = {
      ...request,
      id: request?.id ?? openOpsId(),
      projectId,
      created: existing?.created ?? new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const config = await repo().save(aiConfig);

    sendAiConfigSavedEvent({
      id: config.id,
      userId: params.userId,
      projectId: params.projectId,
      enabled: config.enabled ?? false,
    });

    return config;
  },

  async list(projectId: string): Promise<AiConfig[]> {
    return repo().findBy({ projectId });
  },

  async get(params: {
    projectId: string;
    id: string;
  }): Promise<AiConfig | undefined> {
    return getOneBy({
      id: params.id,
      projectId: params.projectId,
    });
  },

  async getActiveConfig(projectId: string): Promise<AiConfig | undefined> {
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
): Promise<AiConfig | undefined> {
  const config = await repo().findOneBy(where);

  if (isNil(config)) {
    return undefined;
  }

  return config;
}
