import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { validateAiProviderConfig } from '@openops/common';
import { AiConfig, PrincipalType, SaveAiConfigRequest } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { encryptUtils } from '../../helper/encryption';
import { AiApiKeyRedactionMessage } from './ai-config.entity';
import { aiConfigService } from './ai-config.service';

export const aiConfigController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post(
    '/',
    SaveAiConfigOptions,
    async (request, reply): Promise<AiConfig> => {
      let existingApiKey = request.body.apiKey;
      if (request.body.apiKey == AiApiKeyRedactionMessage && request.body.id) {
        const existingConfig = await aiConfigService.getWithApiKey({
          projectId: request.principal.projectId,
          id: request.body.id,
        });

        existingApiKey = existingConfig
          ? encryptUtils.decryptString(JSON.parse(existingConfig.apiKey))
          : existingApiKey;
      }

      const { valid, error } = await validateAiProviderConfig({
        ...request.body,
        apiKey: existingApiKey,
      });

      if (!valid) {
        return reply.status(StatusCodes.BAD_REQUEST).send(error);
      }

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
    description: 'Returns all AI configs for the current project.',
  },
};

const aiConfigIdRequest = {
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
