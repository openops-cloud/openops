import {
  isNil,
  McpConfig,
  openOpsId,
  SaveMcpConfigRequest,
} from '@openops/shared';
import { McpConfigEntity } from '../../ai/config/mcp-config.entity';
import { repoFactory } from '../../core/db/repo-factory';
import {
  sendMcpConfigDeletedEvent,
  sendMcpConfigSavedEvent,
} from '../../telemetry/event-models';

const repo = repoFactory(McpConfigEntity);

export const mcpConfigService = {
  async save(params: {
    userId: string;
    projectId: string;
    request: SaveMcpConfigRequest;
  }): Promise<McpConfig> {
    const { projectId, request, userId } = params;

    const existing = request.id
      ? await repo().findOneBy({ id: request.id, projectId })
      : null;

    const aiConfig: Partial<McpConfig> = {
      ...request,
      id: request?.id ?? openOpsId(),
      projectId,
      created: existing?.created ?? new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const config = await repo().save(aiConfig);

    sendMcpConfigSavedEvent({
      userId,
      projectId,
      id: config.id,
      config: config.config,
      name: config.name,
      created: aiConfig.created ?? '',
      updated: aiConfig.updated ?? '',
    });

    return config;
  },

  async get(params: {
    projectId: string;
    id: string;
  }): Promise<McpConfig | undefined> {
    return getOneBy({
      id: params.id,
      projectId: params.projectId,
    });
  },

  async list(projectId: string): Promise<McpConfig[]> {
    return repo().findBy({ projectId });
  },

  async delete({
    projectId,
    id,
    userId,
  }: {
    projectId: string;
    id: string;
    userId: string;
  }): Promise<void> {
    await repo().delete({ projectId, id });
    sendMcpConfigDeletedEvent({
      id,
      userId,
      projectId,
    });
  },
};

async function getOneBy(
  where: Partial<Pick<McpConfig, 'id' | 'projectId'>>,
): Promise<McpConfig | undefined> {
  const config = await repo().findOneBy(where);

  if (isNil(config)) {
    return undefined;
  }

  return config;
}
