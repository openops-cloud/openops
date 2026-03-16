import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { BlockMetadataModel } from '@openops/blocks-framework';
import { AddBlockRequestBody, PrincipalType } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { blockService } from './block-service';

export const communityBlocksModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(communityBlocksController, { prefix: '/v1/blocks' });
};

const communityBlocksController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/',
    {
      config: {
        allowedPrincipals: [PrincipalType.USER],
        security: getProjectScopedRoutePolicy({
          allowedPrincipals: [PrincipalType.USER],
        }),
      },
      schema: {
        body: AddBlockRequestBody,
      },
    },
    async (req, res): Promise<BlockMetadataModel> => {
      const organizationId = req.principal.organization.id;
      const projectId = req.principal.projectId;
      const blockMetadata = await blockService.installBlock(
        organizationId,
        projectId,
        req.body,
      );
      return res.code(StatusCodes.CREATED).send(blockMetadata);
    },
  );
};
