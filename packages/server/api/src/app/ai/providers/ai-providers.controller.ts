import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { getAvailableProvidersWithModels } from '@openops/common';
import { GetProvidersResponse, PrincipalType } from '@openops/shared';

export const aiProvidersController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    ListAiProvidersRequest,
    async (): Promise<GetProvidersResponse[]> => {
      return getAvailableProvidersWithModels();
    },
  );
};

const ListAiProvidersRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-providers'],
    description: 'Get ai providers with their models',
  },
};
