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
      const aiConfig = await aiConfigService.upsert({
        projectId: request.principal.projectId,
        request: request.body,
      });

      return reply.status(StatusCodes.OK).send(aiConfig);
    },
  );

  app.get(
    '/:id',
    getAiConfigByIdRequest,
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
    description: 'Returns all AI configs for the current project.',
  },
};

const getAiConfigByIdRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-config'],
    description: 'Returns a single AI config by ID.',
    params: Type.Object({
      id: Type.String(),
    }),
  },
};
