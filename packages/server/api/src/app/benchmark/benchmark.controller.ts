import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkCreationResult,
  BenchmarkProviders,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  CreateBenchmarkRequest,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { createBenchmark } from './create-benchmark.service';
import { resolveWizardNavigation } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled(
        request.params.provider,
        request.principal.projectId,
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

  app.post(
    '/:provider',
    CreateBenchmarkRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled(
        request.params.provider,
        request.principal.projectId,
      );

      const result = await createBenchmark({
        provider: request.params.provider,
        projectId: request.principal.projectId,
        userId: request.principal.id,
        benchmarkConfiguration: request.body.benchmarkConfiguration,
      });
      return reply.status(StatusCodes.CREATED).send(result);
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

const CreateBenchmarkRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Creates a new benchmark for a given provider and returns the result.',
    params: Type.Object({
      provider: Type.Enum(BenchmarkProviders),
    }),
    body: CreateBenchmarkRequest,
    response: {
      [StatusCodes.CREATED]: BenchmarkCreationResult,
    },
  },
};
