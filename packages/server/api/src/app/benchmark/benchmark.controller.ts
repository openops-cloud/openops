import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BenchmarkCreationResult,
  BenchmarkProviders,
  BenchmarkStatusResponse,
  CreateBenchmarkRequest,
  ListBenchmarksResponse,
  Permission,
  PrincipalType,
  WizardRequest,
  WizardStepResponse,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { resolveWizardNavigation } from '../wizard/wizard.service';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';
import { getBenchmarkStatus, listBenchmarks } from './benchmark-status.service';
import { createBenchmark } from './create-benchmark.service';
import { getProvider } from './providers/providers-registry';

export const benchmarkController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preHandler', assertBenchmarkFeatureEnabled);

  app.post(
    '/:provider/wizard',
    WizardStepRequestOptions,
    async (request, reply) => {
      const provider = request.params.provider;
      const providerAdapter = getProvider(provider);

      const step = await resolveWizardNavigation(
        provider,
        providerAdapter,
        {
          currentStep: request.body.currentStep,
          wizardState: request.body.wizardState,
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
      const result = await createBenchmark({
        provider: request.params.provider,
        projectId: request.principal.projectId,
        userId: request.principal.id,
        wizardState: request.body.wizardState,
      });

      return reply.status(StatusCodes.CREATED).send(result);
    },
  );

  app.get('/', ListBenchmarksRequestOptions, async (request, reply) => {
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
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: Permission.READ_RUN,
    }),
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
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: [
        Permission.READ_APP_CONNECTION,
        Permission.UPDATE_FLOW_STATUS,
        Permission.WRITE_FOLDER,
        Permission.DELETE_FLOW,
        Permission.WRITE_FLOW,
      ],
    }),
  },
  schema: {
    tags: ['benchmarks'],
    description:
      'Returns a step in the benchmark configuration wizard for the specified provider, including options and progress.',
    params: Type.Object({
      provider: Type.Enum(BenchmarkProviders),
    }),
    body: WizardRequest,
    response: {
      [StatusCodes.OK]: WizardStepResponse,
    },
  },
};

const CreateBenchmarkRequestOptions = {
  config: {
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: [
        Permission.READ_APP_CONNECTION,
        Permission.UPDATE_FLOW_STATUS,
        Permission.WRITE_FOLDER,
        Permission.DELETE_FLOW,
        Permission.WRITE_FLOW,
      ],
    }),
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
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: Permission.READ_RUN,
    }),
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
