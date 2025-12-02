import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { ALL_PRINCIPAL_TYPES, OpenOpsId } from '@openops/shared';
import {
  allowAllOriginsHookHandlerTest,
} from '../helper/allow-all-origins-hook-handler';
import { getVerifiedUser } from '../user-info/cloud-auth';
import { flowTemplateService } from './flow-template.service';

export const cloudTemplateController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  const publicKey = system.get(AppSystemProp.FRONTEGG_PUBLIC_KEY) || '';
  // const connectionPageEnabled = system.getBoolean(
  //   AppSystemProp.CLOUD_CONNECTION_PAGE_ENABLED,
  // );
  //
  // if (!publicKey || !connectionPageEnabled) {
  //   logger.info(
  //     'Missing Frontegg configuration, disabling cloud templates API',
  //   );
  //   return;
  // }

  // app.addHook('onRequest', allowAllOriginsHookHandler);

  // cloud templates are available on any origin
  app.options(
    '/*',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
        cors: false,
      },
    },
    allowAllOriginsHookHandlerTest,
  );

  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
        cors: false,
      },
      schema: {
        tags: ['flow-templates'],
        description:
          'Retrieve a paginated list of cloud-based flow templates. This endpoint supports filtering by search terms, tags, services, domains, blocks, and categories. For authenticated users, it returns all available templates, while unauthenticated users only see sample templates. Results can be filtered by version to ensure compatibility.',
        querystring: Type.Object({
          search: Type.Optional(Type.String()),
          tags: Type.Optional(Type.Array(Type.String())),
          services: Type.Optional(Type.Array(Type.String())),
          domains: Type.Optional(Type.Array(Type.String())),
          blocks: Type.Optional(Type.Array(Type.String())),
          version: Type.Optional(Type.String()),
          categories: Type.Optional(Type.Array(Type.String())),
        }),
      },
    },
    async (request) => {
      return [];
      // const user = getVerifiedUser(request, publicKey);
      //
      // return flowTemplateService.getFlowTemplates({
      //   search: request.query.search,
      //   tags: request.query.tags,
      //   services: request.query.services,
      //   domains: request.query.domains,
      //   blocks: request.query.blocks,
      //   projectId: request.principal.projectId,
      //   organizationId: request.principal.organization.id,
      //   cloudTemplates: true,
      //   isSample: !user,
      //   version: request.query.version,
      //   categories: request.query.categories,
      // });
    },
  );

  app.get(
    '/:id',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
        cors: false,
      },
      schema: {
        tags: ['flow-templates'],
        description:
          'Retrieve detailed information about a specific cloud flow template by its ID. This endpoint returns the complete template configuration including its structure, blocks, and metadata. For unauthenticated users, only sample templates are accessible. Authenticated users can access all templates in their organization.',
        params: Type.Object({
          id: OpenOpsId,
        }),
      },
    },
    async (request, reply) => {
      const user = getVerifiedUser(request, publicKey);

      if (!user) {
        const template = await flowTemplateService.getFlowTemplate(
          request.params.id,
        );

        return template?.isSample ? template : reply.status(403).send();
      }

      return flowTemplateService.getFlowTemplate(request.params.id);
    },
  );
};
