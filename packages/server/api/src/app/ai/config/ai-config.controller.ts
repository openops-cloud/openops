import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { AiConfig, PrincipalType, SaveAiConfigRequest } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { aiConfigService } from './ai-config.service';

export const aiConfigController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post(
    '/',
    SaveAiConfigOptions,
    async (request, reply): Promise<AiConfig> => {
      const aiConfig = await aiConfigService.save({
        projectId: request.principal.projectId,
        request: request.body,
        userId: request.principal.id,
      });

      return reply.status(StatusCodes.OK).send(aiConfig);
    },
  );

  app.get(
    '/:id',
    aiConfigIdRequest,
    async (request, reply): Promise<AiConfig> => {
      const config = await aiConfigService.get({
        projectId: request.principal.projectId,
        id: request.params.id,
      });

      if (!config) {
        return reply.status(StatusCodes.NOT_FOUND).send();
      }

      return reply.status(StatusCodes.OK).send(config);
    },
  );

  app.get(
    '/',
    getAiConfigRequest,
    async (request, reply): Promise<AiConfig[]> => {
      const configs = await aiConfigService.list(request.principal.projectId);

      return reply.status(StatusCodes.OK).send(configs);
    },
  );

  app.get(
    '/active',
    getAiConfigRequest,
    async (request, reply): Promise<AiConfig> => {
      const config = await aiConfigService.getActiveConfig(
        request.principal.projectId,
      );

      if (!config) {
        return reply.status(StatusCodes.NOT_FOUND).send();
      }

      return reply.status(StatusCodes.OK).send(config);
    },
  );

  app.delete('/:id', aiConfigIdRequest, async (request, reply) => {
    try {
      await aiConfigService.delete({
        projectId: request.principal.projectId,
        id: request.params.id,
        userId: request.principal.id,
      });
      return await reply.status(StatusCodes.OK).send();
    } catch (error) {
      return reply.status(StatusCodes.NOT_FOUND).send({ message: error });
    }
  });
};

const SaveAiConfigOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-config'],
    description:
      'Saves an ai config. If the config already exists, it will be updated. Otherwise, a new config will be created.',
    body: SaveAiConfigRequest,
  },
};

const getAiConfigRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-config'],
    description:
      'List all AI configurations or get the active configuration. This endpoint allows you to retrieve either all AI configurations for the project or specifically the currently active configuration.',
  },
};

const aiConfigIdRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-config'],
    description:
      'Get or delete an AI configuration by its ID. This endpoint allows you to retrieve or remove a specific AI configuration from the project.',
    params: Type.Object({
      id: Type.String(),
    }),
  },
};
