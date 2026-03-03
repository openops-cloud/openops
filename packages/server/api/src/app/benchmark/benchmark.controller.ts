import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkCreationResult,
  BenchmarkProviders,
  BenchmarkStatusResponse,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  CreateBenchmarkRequest,
  ListBenchmarksResponse,
  PrincipalType,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { getBenchmarkStatus, listBenchmarks } from './benchmark-status.service';
import { createBenchmark } from './create-benchmark.service';
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
  app.get('/', ListBenchmarksRequestOptions, async (request, reply) => {
    await assertBenchmarkFeatureEnabled(
      request.principal.projectId,
      request.query.provider,
    );
    const items = await listBenchmarks({
      projectId: request.principal.projectId,
      provider: request.query.provider,
    });
    return reply.status(StatusCodes.OK).send(items);
  });

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

const ListBenchmarksRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns the list of benchmarks for the project, optionally filtered by provider.',
    querystring: Type.Object({
      provider: Type.Optional(Type.Enum(BenchmarkProviders)),
    }),
    response: {
      [StatusCodes.OK]: ListBenchmarksResponse,
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

const CreateBenchmarkRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Creates a new benchmark for the given provider from the request configuration and returns the created benchmark (benchmarkId, folderId, workflows, webhookPayload).',
    params: Type.Object({
      provider: Type.Enum(BenchmarkProviders),
    }),
    body: CreateBenchmarkRequest,
    response: {
      [StatusCodes.CREATED]: BenchmarkCreationResult,
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
