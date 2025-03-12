import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { OpenOpsId, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { entitiesMustBeOwnedByCurrentProject } from '../authentication/authorization';
import { flowTemplateService } from './flow-template.service';

export const flowTemplateController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.get(
    '/',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
      },
      schema: {
        tags: ['flow-templates'],
        description: 'List flow templates',
        querystring: Type.Object({
          search: Type.Optional(Type.String()),
          tags: Type.Optional(Type.Array(Type.String())),
          services: Type.Optional(Type.Array(Type.String())),
          domains: Type.Optional(Type.Array(Type.String())),
          blocks: Type.Optional(Type.Array(Type.String())),
        }),
      },
    },
    async (request) => {
      return flowTemplateService.getFlowTemplates({
        search: request.query.search,
        tags: request.query.tags,
        services: request.query.services,
        domains: request.query.domains,
        blocks: request.query.blocks,
        projectId: request.principal.projectId,
        organizationId: request.principal.organization.id,
      });
    },
  );

  app.get(
    '/:id',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
      },
      schema: {
        tags: ['flow-templates'],
        description: 'Get a flow template by id',
        params: Type.Object({
          id: OpenOpsId,
        }),
      },
    },
    async (request) => {
      return flowTemplateService.getFlowTemplate(request.params.id);
    },
  );

  app.post(
    '/',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
      },
      schema: {
        body: {
          type: 'object',
          required: ['flowId'],
          properties: {
            flowId: { type: 'string' },
            tags: { type: 'array' },
            services: { type: 'array' },
            domains: { type: 'array' },
            isSample: { type: 'boolean' },
            isGettingStarted: { type: 'boolean' },
            minVersion: { type: 'string' },
            maxVersion: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          flowId: string;
          tags: string[];
          services: string[];
          domains: string[];
          isSample: boolean;
          isGettingStarted: boolean;
          minVersion: string;
          maxVersion: string;
        };
      }>,
      reply,
    ) => {
      try {
        const result = await flowTemplateService.createFlowTemplate({
          flowId: request.body.flowId,
          tags: request.body.tags,
          services: request.body.services,
          domains: request.body.domains,
          isSample: request.body.isSample,
          isGettingStarted: request.body.isGettingStarted,
          projectId: request.principal.projectId,
          organizationId: request.principal.organization.id,
          minVersion: request.body.minVersion,
          maxVersion: request.body.maxVersion,
        });

        await reply.status(200).send({ result });
      } catch (error) {
        await reply
          .status(500)
          .send({ error: `Failed to add template. ${error}` });
      }
    },
  );
};
