import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkProviders,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { resolveWizardNavigation } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled({
        provider: request.params.provider,
        projectId: request.principal.projectId,
      });

      const step = await resolveWizardNavigation(
        request.params.provider,
        {
          currentStep: request.body.currentStep,
          benchmarkConfiguration: request.body.benchmarkConfiguration,
        },
        request.principal.projectId,
      );
      return reply.status(StatusCodes.OK).send(step);
    },
  );
};

const WizardStepRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns a step in the benchmark configuration wizard for the specified provider, including options and progress.',
    params: Type.Object({
      provider: Type.Enum(BenchmarkProviders),
    }),
    body: BenchmarkWizardRequest,
    response: {
      [StatusCodes.OK]: BenchmarkWizardStepResponse,
    },
  },
};
