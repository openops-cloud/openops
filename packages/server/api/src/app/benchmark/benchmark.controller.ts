import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkProviders,
  BenchmarkStatusResponse,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { getBenchmarkStatus } from './benchmark-status.service';
import { resolveWizardNavigation } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled(
        request.principal.projectId,
        request.params.provider,
      );

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

  app.get(
    '/:benchmarkId/status',
    BenchmarkStatusRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled(request.principal.projectId);
      const status = await getBenchmarkStatus({
        benchmarkId: request.params.benchmarkId,
        projectId: request.principal.projectId,
      });
      return reply.status(StatusCodes.OK).send(status);
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

const BenchmarkStatusRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns the current status of a benchmark run, including overall status and per-workflow run details.',
    params: Type.Object({
      benchmarkId: Type.String(),
    }),
    response: {
      [StatusCodes.OK]: BenchmarkStatusResponse,
    },
  },
};
