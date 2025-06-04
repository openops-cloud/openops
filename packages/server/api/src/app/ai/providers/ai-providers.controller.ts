import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

import {
  getAiProvider,
  getAvailableProvidersWithModels,
} from '@openops/common';
import {
  AiProviderEnum,
  GetProvidersResponse,
  PrincipalType,
} from '@openops/shared';

export const aiProvidersController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    ListAiProvidersRequest,
    async (): Promise<GetProvidersResponse[]> => {
      return getAvailableProvidersWithModels();
    },
  );

  app.get(
    '/:provider',
    GetAiProviderRequest,
    async (request): Promise<GetProvidersResponse> => {
      const { provider } = request.params;
      const aiProvider = getAiProvider(provider as AiProviderEnum);
      return {
        provider: provider as string,
        models: aiProvider.models,
      };
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

const GetAiProviderRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['ai-providers'],
    description: 'Get a specific AI provider with its models',
    params: Type.Object({
      provider: Type.Enum(AiProviderEnum),
    }),
  },
};
