import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import {
  AiProviderEnum,
  getAvailableProvidersWithModels,
} from '@openops/common';
import { PrincipalType } from '@openops/shared';

export const aiProvidersController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    ListAiProvidersRequest,
    async (): Promise<{ aiProvider: AiProviderEnum; models: string[] }[]> => {
      return getAvailableProvidersWithModels();
    },
  );
};

const ListAiProvidersRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['ai-providers'],
    description: 'Get ai providers with their models',
  },
};
