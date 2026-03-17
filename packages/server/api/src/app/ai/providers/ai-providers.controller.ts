import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  getAiProvider,
  getAvailableProvidersWithModels,
} from '@openops/common';
import {
  AiProviderEnum,
  GetProvidersResponse,
  PrincipalType,
} from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { getUnscopedRoutePolicy } from '../../core/security/route-policies/route-security-policy-factory';

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
    security: getUnscopedRoutePolicy([PrincipalType.USER]),
  },
  schema: {
    tags: ['ai-providers'],
    description:
      'List all available AI providers and their models. This endpoint retrieves information about all supported AI service providers and the models they offer, enabling integration with various AI services.',
  },
};

const GetAiProviderRequest = {
  config: {
    security: getUnscopedRoutePolicy([PrincipalType.USER]),
  },
  schema: {
    tags: ['ai-providers'],
    description: 'Get a specific AI provider with its models',
    params: Type.Object({
      provider: Type.Enum(AiProviderEnum),
    }),
  },
};
