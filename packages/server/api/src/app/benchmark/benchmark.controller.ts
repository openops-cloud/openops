import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  ErrorCode,
  FlagId,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { flagService } from '../flags/flag.service';
import { resolveWizardNavigation } from './wizard.service';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      const benchmarkFlag = await flagService.getOne(
        FlagId.FINOPS_BENCHMARK_ENABLED,
      );
      if (benchmarkFlag?.value !== true) {
        logger.info(
          'Benchmark wizard access denied: FINOPS_BENCHMARK_ENABLED flag is not enabled',
          {
            provider: request.params.provider,
            projectId: request.principal.projectId,
          },
        );
        throw new ApplicationError(
          {
            code: ErrorCode.FEATURE_DISABLED,
            params: { message: 'Benchmark feature is not enabled' },
          },
          'Benchmark feature is not enabled',
        );
      }

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
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns a step in the benchmark configuration wizard for the specified provider, including options and progress.',
    params: Type.Object({
      provider: Type.String(),
    }),
    body: BenchmarkWizardRequest,
    response: {
      [StatusCodes.OK]: BenchmarkWizardStepResponse,
    },
  },
};
