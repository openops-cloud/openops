import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  McpConfig,
  PrincipalType,
  SaveMcpConfigRequest,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { mcpConfigService } from './mcp-config.service';

export const mcpConfigController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post(
    '/',
    SaveMcpConfigOptions,
    async (request, reply): Promise<McpConfig> => {
      const mcpConfig = await mcpConfigService.save({
        projectId: request.principal.projectId,
        request: request.body,
        userId: request.principal.id,
      });

      return reply.status(StatusCodes.OK).send(mcpConfig);
    },
  );

  app.get(
    '/',
    getMcpConfigRequest,
    async (request, reply): Promise<McpConfig[]> => {
      const config = await mcpConfigService.list(request.principal.projectId);
      return reply.status(StatusCodes.OK).send(config);
    },
  );

  app.delete('/:id', mcpConfigIdRequest, async (request, reply) => {
    await mcpConfigService.delete({
      projectId: request.principal.projectId,
      id: request.params.id,
      userId: request.principal.id,
    });
    return reply.status(StatusCodes.OK).send();
  });
};

const SaveMcpConfigOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['mcp-config'],
    description:
      'Saves an mcp config. If the config already exists, it will be updated. Otherwise, a new config will be created.',
    body: SaveMcpConfigRequest,
  },
};

const getMcpConfigRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['mcp-config'],
    description: 'Retrieves the MCP configuration for the current project.',
  },
};

const mcpConfigIdRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['mcp-config'],
    description:
      'Get or delete an Mcp configuration by its ID. This endpoint allows you to retrieve or remove a specific AI configuration from the project.',
    params: Type.Object({
      id: Type.String(),
    }),
  },
};
