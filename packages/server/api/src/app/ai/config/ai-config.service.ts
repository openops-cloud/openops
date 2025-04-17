// src/modules/ai-config/ai-config.service.ts
import { Type } from '@fastify/type-provider-typebox';
import { openOpsId } from '@openops/shared';
import { repoFactory } from '../../core/db/repo-factory';
import { AiConfig, AiConfigEntity } from './ai-config.entity';

const repo = repoFactory(AiConfigEntity);

export const AiConfigResponse = Type.Object({
  id: Type.String(),
  projectId: Type.String(),
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Any())),
  enabled: Type.Optional(Type.Boolean()),
});

export const aiConfigService = {
  async upsert(params: {
    projectId: string;
    userId: string;
    request: {
      provider: string;
      model: string;
      apiKey: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modelSettings?: Record<string, any>;
      enabled?: boolean;
    };
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
