import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
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
