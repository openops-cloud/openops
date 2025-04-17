import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  Permission,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { AiConfigResponse, aiConfigService } from './ai-config.service';

export const UpsertAiConfigRequestBody = Type.Object({
  provider: Type.String(),
  model: Type.String(),
  apiKey: Type.String(),
  modelSettings: Type.Optional(Type.Record(Type.String(), Type.Any())),
  enabled: Type.Optional(Type.Boolean()),
});

export const aiConfigController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post(
    '/',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
        permission: Permission.WRITE_AI_CONFIG,
      },
      schema: {
        tags: ['ai-providers'],
        security: [SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Upsert an AI config',
        body: UpsertAiConfigRequestBody,
        response: {
          [StatusCodes.CREATED]: AiConfigResponse,
        },
      },
    },
    async (request, reply) => {
      const aiConfig = await aiConfigService.upsert({
        projectId: request.principal.projectId,
        userId: request.principal.id,
        request: request.body,
      });

      await reply.status(StatusCodes.CREATED).send(aiConfig);
    },
  );
};
