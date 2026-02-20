import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkProviders,
  BenchmarkResponse,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { IsNull } from 'typeorm';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { benchmarkRepo } from './benchmark.repo';
import { resolveWizardNavigation } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/:provider',
    GetBenchmarkRequestOptions,
    async (request, reply) => {
      await assertBenchmarkFeatureEnabled(
        request.params.provider,
        request.principal.projectId,
      );

      const benchmark = await benchmarkRepo().findOne({
        where: {
          projectId: request.principal.projectId,
          provider: request.params.provider,
          deletedAt: IsNull(),
        },
        order: { created: 'DESC' },
      });

      if (!benchmark) {
        return reply.status(StatusCodes.NOT_FOUND).send();
      }

      return reply.status(StatusCodes.OK).send({
        id: benchmark.id,
        provider: benchmark.provider,
        lastRunId: benchmark.lastRunId,
      });
    },
  );

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
};

const GetBenchmarkRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns the benchmark record for the given provider and the current project.',
    params: Type.Object({
      provider: Type.Enum(BenchmarkProviders),
    }),
    response: {
      [StatusCodes.OK]: BenchmarkResponse,
    },
  },
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
