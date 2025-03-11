import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { IdentityClient } from '@frontegg/client';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ALL_PRINCIPAL_TYPES, OpenOpsId } from '@openops/shared';
import { getCloudToken, getCloudUser } from '../user-info/cloud-auth';
import { flowTemplateService } from './flow-template.service';

export const cloudTemplateController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  const fronteggClientId = system.get(AppSystemProp.FRONTEGG_CLIENT_ID);
  const fronteggApiKey = system.get(AppSystemProp.FRONTEGG_API_KEY);

  if (!fronteggClientId || !fronteggApiKey) {
    logger.info(
      'Missing Frontegg configuration, disabling cloud templates API',
    );
    return;
  }

  const identityClient = new IdentityClient({
    FRONTEGG_CLIENT_ID: fronteggClientId,
    FRONTEGG_API_KEY: fronteggApiKey,
  });

  // cloud templates are available on any origin
  app.addHook('onSend', (request, reply, payload, done) => {
    void reply.header(
      'Access-Control-Allow-Origin',
      request.headers.origin || request.headers['Ops-Origin'] || '*',
    );
    void reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
    void reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type,Ops-Origin,Authorization',
    );
    void reply.header('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }

    done(null, payload);
    return;
  });

  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
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
          version: Type.Optional(Type.String()),
        }),
      },
    },
    async (request) => {
      const token = getCloudToken(request);

      if (!(await getCloudUser(identityClient, token))) {
        return flowTemplateService.getFlowTemplates({
          search: request.query.search,
          tags: request.query.tags,
          services: request.query.services,
          domains: request.query.domains,
          blocks: request.query.blocks,
          projectId: request.principal.projectId,
          organizationId: request.principal.organization.id,
          cloudTemplates: true,
          isSample: true,
          version: request.query.version,
        });
      }

      return flowTemplateService.getFlowTemplates({
        search: request.query.search,
        tags: request.query.tags,
        services: request.query.services,
        domains: request.query.domains,
        blocks: request.query.blocks,
        projectId: request.principal.projectId,
        organizationId: request.principal.organization.id,
        cloudTemplates: true,
        version: request.query.version,
      });
    },
  );

  app.get(
    '/:id',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
      schema: {
        tags: ['flow-templates'],
        description: 'Get a flow template by id',
        params: Type.Object({
          id: OpenOpsId,
        }),
      },
    },
    async (request, reply) => {
      const token = getCloudToken(request);
      if (!(await getCloudUser(identityClient, token))) {
        const template = await flowTemplateService.getFlowTemplate(
          request.params.id,
        );

        return template?.isSample ? template : reply.status(404).send();
      }

      return flowTemplateService.getFlowTemplate(request.params.id);
    },
  );
};
