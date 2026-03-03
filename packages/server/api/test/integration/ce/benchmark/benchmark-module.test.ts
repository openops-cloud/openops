const wizardServiceMock = {
  resolveWizardNavigation: jest.fn(),
};
jest.mock(
  '../../../../src/app/benchmark/wizard.service',
  () => wizardServiceMock,
);

const createBenchmarkServiceMock = {
  createBenchmark: jest.fn(),
};
jest.mock(
  '../../../../src/app/benchmark/create-benchmark.service',
  () => createBenchmarkServiceMock,
);

const benchmarkStatusServiceMock = {
  getBenchmarkStatus: jest.fn(),
  listBenchmarks: jest.fn(),
};
jest.mock(
  '../../../../src/app/benchmark/benchmark-status.service',
  () => benchmarkStatusServiceMock,
);

import {
  ApplicationError,
  BenchmarkListItem,
  BenchmarkProviders,
  BenchmarkStatus,
  type BenchmarkStatusResponse,
  type BenchmarkWizardStepResponse,
  ErrorCode,
  PrincipalType,
  Project,
} from '@openops/shared';
import { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

const mockWizardStep: BenchmarkWizardStepResponse = {
  currentStep: 'mock-current-step-id',
  title: 'Mock current step title',
  nextStep: 'mock-next-step-id',
  selectionType: 'single',
  options: [],
  stepIndex: 1,
  totalSteps: 3,
};

const mockBenchmarkStatus: BenchmarkStatusResponse = {
  benchmarkId: 'benchmark-001',
  status: BenchmarkStatus.CREATED,
  workflows: [],
};

const originalEnv = { ...process.env };
let app: FastifyInstance | null = null;

const createAndInsertMocks = async (): Promise<{
  token: string;
  project: Project;
}> => {
  const mockUser = createMockUser();
  await databaseConnection().getRepository('user').save([mockUser]);

  const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
  await databaseConnection()
    .getRepository('organization')
    .save(mockOrganization);

  const mockProject = createMockProject({
    ownerId: mockUser.id,
    organizationId: mockOrganization.id,
  });
  await databaseConnection().getRepository('project').save([mockProject]);

  const mockToken = await generateMockToken({
    id: mockUser.id,
    type: PrincipalType.USER,
    projectId: mockProject.id,
    organization: { id: mockOrganization.id },
  });

  return { token: mockToken, project: mockProject };
};

beforeAll(async () => {
  wizardServiceMock.resolveWizardNavigation.mockResolvedValue(mockWizardStep);
  benchmarkStatusServiceMock.getBenchmarkStatus.mockResolvedValue(
    mockBenchmarkStatus,
  );
  process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'true';
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
  process.env = originalEnv;
});

describe('Benchmark wizard API', () => {
  const postWizard = async ({
    provider,
    token,
    body = {},
  }: {
    provider: string;
    token?: string;
    body?: Record<string, unknown>;
  }): Promise<LightMyRequestResponse | undefined> =>
    app?.inject({
      method: 'POST',
      url: `/v1/benchmarks/${provider}/wizard`,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body,
    });

  describe('POST /v1/benchmarks/:provider/wizard', () => {
    beforeEach(() => {
      wizardServiceMock.resolveWizardNavigation.mockResolvedValue(
        mockWizardStep,
      );
      process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'true';
    });

    it('calls resolveWizardNavigation with AWS provider, body, and projectId and returns mocked step', async () => {
      const { token, project } = await createAndInsertMocks();
      const body = {};

      const response = await postWizard({
        provider: BenchmarkProviders.AWS,
        token,
        body,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual(mockWizardStep);
      expect(wizardServiceMock.resolveWizardNavigation).toHaveBeenCalledTimes(
        1,
      );
      expect(wizardServiceMock.resolveWizardNavigation).toHaveBeenCalledWith(
        BenchmarkProviders.AWS,
        {
          currentStep: undefined,
          benchmarkConfiguration: undefined,
        },
        project.id,
      );
    });

    it('passes currentStep and benchmarkConfiguration to resolveWizardNavigation', async () => {
      const { token, project } = await createAndInsertMocks();
      const body = {
        currentStep: 'connection',
        benchmarkConfiguration: { connection: ['conn-1'] },
      };

      const response = await postWizard({
        provider: BenchmarkProviders.AWS,
        token,
        body,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual(mockWizardStep);
      expect(wizardServiceMock.resolveWizardNavigation).toHaveBeenCalledWith(
        BenchmarkProviders.AWS,
        {
          currentStep: 'connection',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        project.id,
      );
    });

    it('returns 400 when provider is not in BenchmarkProviders enum', async () => {
      const { token } = await createAndInsertMocks();
      wizardServiceMock.resolveWizardNavigation.mockClear();

      const response = await postWizard({
        provider: 'invalidprovider',
        token,
        body: {},
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(wizardServiceMock.resolveWizardNavigation).not.toHaveBeenCalled();
    });

    it('returns 409 with VALIDATION code when resolveWizardNavigation throws', async () => {
      wizardServiceMock.resolveWizardNavigation.mockRejectedValue(
        new ApplicationError(
          {
            code: ErrorCode.VALIDATION,
            params: { message: 'Unknown provider' },
          },
          'Unknown provider',
        ),
      );
      const { token } = await createAndInsertMocks();

      const response = await postWizard({
        provider: BenchmarkProviders.AWS,
        token,
        body: {},
      });

      expect(response?.statusCode).toBe(StatusCodes.CONFLICT);
      const data = response?.json();
      expect(data?.code).toBe('VALIDATION');
      expect(data?.params).toBeDefined();
    });

    it('returns 402 when FINOPS_BENCHMARK_ENABLED flag is disabled', async () => {
      process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'false';
      wizardServiceMock.resolveWizardNavigation.mockClear();

      const { token } = await createAndInsertMocks();
      const response = await postWizard({
        provider: BenchmarkProviders.AWS,
        token,
        body: {},
      });

      expect(response?.statusCode).toBe(StatusCodes.PAYMENT_REQUIRED);
      const data = response?.json();
      expect(data?.code).toBe('FEATURE_DISABLED');
      expect(data?.params).toBeDefined();
      expect(wizardServiceMock.resolveWizardNavigation).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      wizardServiceMock.resolveWizardNavigation.mockClear();

      const response = await postWizard({
        provider: BenchmarkProviders.AWS,
        body: {},
      });

      expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(wizardServiceMock.resolveWizardNavigation).not.toHaveBeenCalled();
    });
  });
});

describe('Create Benchmark API (POST /v1/benchmarks/:provider)', () => {
  const validCreateBody = {
    benchmarkConfiguration: {
      connection: ['conn-1'],
      workflows: ['AWS Benchmark - Unattached EBS'],
      regions: ['us-east-1'],
    },
  };

  const mockCreateResult = {
    benchmarkId: 'bench-1',
    folderId: 'folder-1',
    provider: 'aws',
    workflows: [
      { flowId: 'flow-1', displayName: 'Orchestrator', isOrchestrator: true },
      { flowId: 'flow-2', displayName: 'Cleanup', isOrchestrator: false },
      { flowId: 'flow-3', displayName: 'Sub', isOrchestrator: false },
    ],
    webhookPayload: {
      webhookBaseUrl: 'https://api.example.com',
      workflows: ['flow-3'],
      cleanupWorkflows: ['flow-2'],
      accounts: [],
      regions: ['us-east-1'],
    },
  };

  const postCreate = async ({
    provider,
    token,
    body,
  }: {
    provider: string;
    token?: string;
    body?: Record<string, unknown>;
  }): Promise<LightMyRequestResponse | undefined> =>
    app?.inject({
      method: 'POST',
      url: `/v1/benchmarks/${provider}`,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body: body ?? validCreateBody,
    });

  beforeEach(() => {
    createBenchmarkServiceMock.createBenchmark.mockReset();
    process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'true';
  });

  it('returns 201 and BenchmarkCreationResult when body is valid', async () => {
    createBenchmarkServiceMock.createBenchmark.mockResolvedValue(
      mockCreateResult,
    );
    const { token, project } = await createAndInsertMocks();

    const response = await postCreate({
      provider: BenchmarkProviders.AWS,
      token,
      body: validCreateBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.CREATED);
    expect(response?.json()).toEqual(mockCreateResult);
    expect(createBenchmarkServiceMock.createBenchmark).toHaveBeenCalledTimes(1);
    expect(createBenchmarkServiceMock.createBenchmark).toHaveBeenCalledWith({
      provider: BenchmarkProviders.AWS,
      projectId: project.id,
      userId: expect.any(String),
      benchmarkConfiguration: validCreateBody.benchmarkConfiguration,
    });
  });

  it('returns 401 when not authenticated', async () => {
    const response = await postCreate({
      provider: BenchmarkProviders.AWS,
      body: validCreateBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    expect(createBenchmarkServiceMock.createBenchmark).not.toHaveBeenCalled();
  });

  it('returns 402 when FINOPS_BENCHMARK_ENABLED is disabled', async () => {
    process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'false';
    const { token } = await createAndInsertMocks();

    const response = await postCreate({
      provider: BenchmarkProviders.AWS,
      token,
      body: validCreateBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.PAYMENT_REQUIRED);
    const data = response?.json();
    expect(data?.code).toBe('FEATURE_DISABLED');
    expect(createBenchmarkServiceMock.createBenchmark).not.toHaveBeenCalled();
  });

  it('returns 400 when provider is not in BenchmarkProviders enum', async () => {
    const { token } = await createAndInsertMocks();

    const response = await postCreate({
      provider: 'invalidprovider',
      token,
      body: validCreateBody,
    });

    expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(createBenchmarkServiceMock.createBenchmark).not.toHaveBeenCalled();
  });

  it('returns 400 when body is missing benchmarkConfiguration', async () => {
    const { token } = await createAndInsertMocks();

    const response = await postCreate({
      provider: BenchmarkProviders.AWS,
      token,
      body: {},
    });

    expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(createBenchmarkServiceMock.createBenchmark).not.toHaveBeenCalled();
  });
});

describe('Benchmark status API', () => {
  const getStatus = async ({
    benchmarkId,
    token,
  }: {
    benchmarkId: string;
    token?: string;
  }): Promise<LightMyRequestResponse | undefined> =>
    app?.inject({
      method: 'GET',
      url: `/v1/benchmarks/${benchmarkId}/status`,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });

  describe('GET /v1/benchmarks/:benchmarkId/status', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      benchmarkStatusServiceMock.getBenchmarkStatus.mockResolvedValue(
        mockBenchmarkStatus,
      );
    });

    it('calls getBenchmarkStatus with benchmarkId and projectId and returns status', async () => {
      const { token, project } = await createAndInsertMocks();
      const benchmarkId = 'benchmark-001';

      const response = await getStatus({ benchmarkId, token });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual(mockBenchmarkStatus);
      expect(
        benchmarkStatusServiceMock.getBenchmarkStatus,
      ).toHaveBeenCalledWith({
        benchmarkId,
        projectId: project.id,
      });
    });

    it('returns 404 when getBenchmarkStatus throws ENTITY_NOT_FOUND', async () => {
      benchmarkStatusServiceMock.getBenchmarkStatus.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'Benchmark', entityId: 'missing-id' },
        }),
      );
      const { token } = await createAndInsertMocks();

      const response = await getStatus({ benchmarkId: 'missing-id', token });

      expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('returns 402 when FINOPS_BENCHMARK_ENABLED flag is disabled', async () => {
      process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'false';
      const { token } = await createAndInsertMocks();

      const response = await getStatus({ benchmarkId: 'benchmark-001', token });

      expect(response?.statusCode).toBe(StatusCodes.PAYMENT_REQUIRED);
      const data = response?.json();
      expect(data?.code).toBe('FEATURE_DISABLED');
      expect(
        benchmarkStatusServiceMock.getBenchmarkStatus,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      const response = await getStatus({ benchmarkId: 'benchmark-001' });

      expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(
        benchmarkStatusServiceMock.getBenchmarkStatus,
      ).not.toHaveBeenCalled();
    });
  });
});

describe('List benchmarks API', () => {
  const getBenchmarkList = async ({
    token,
    provider,
  }: {
    token?: string;
    provider?: string;
  }): Promise<LightMyRequestResponse | undefined> =>
    app?.inject({
      method: 'GET',
      url: '/v1/benchmarks',
      query: provider ? { provider } : {},
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });

  const mockListItem: BenchmarkListItem = {
    benchmarkId: 'benchmark-001',
    provider: BenchmarkProviders.AWS,
    status: BenchmarkStatus.CREATED,
  };

  describe('GET /v1/benchmarks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      benchmarkStatusServiceMock.listBenchmarks.mockResolvedValue([
        mockListItem,
      ]);
      process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'true';
    });

    it('calls listBenchmarks with projectId and returns results', async () => {
      const { token, project } = await createAndInsertMocks();

      const response = await getBenchmarkList({ token });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual([mockListItem]);
      expect(benchmarkStatusServiceMock.listBenchmarks).toHaveBeenCalledWith({
        projectId: project.id,
        provider: undefined,
      });
    });

    it('passes provider filter to listBenchmarks', async () => {
      const { token, project } = await createAndInsertMocks();

      const response = await getBenchmarkList({
        token,
        provider: BenchmarkProviders.AWS,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(benchmarkStatusServiceMock.listBenchmarks).toHaveBeenCalledWith({
        projectId: project.id,
        provider: BenchmarkProviders.AWS,
      });
    });

    it('returns 400 when provider is not a valid BenchmarkProviders value', async () => {
      const { token } = await createAndInsertMocks();

      const response = await getBenchmarkList({
        token,
        provider: 'invalidprovider',
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(benchmarkStatusServiceMock.listBenchmarks).not.toHaveBeenCalled();
    });

    it('returns 402 when FINOPS_BENCHMARK_ENABLED flag is disabled', async () => {
      process.env.OPS_FINOPS_BENCHMARK_ENABLED = 'false';
      const { token } = await createAndInsertMocks();

      const response = await getBenchmarkList({ token });

      expect(response?.statusCode).toBe(StatusCodes.PAYMENT_REQUIRED);
      const data = response?.json();
      expect(data?.code).toBe('FEATURE_DISABLED');
      expect(benchmarkStatusServiceMock.listBenchmarks).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      const response = await getBenchmarkList({});

      expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(benchmarkStatusServiceMock.listBenchmarks).not.toHaveBeenCalled();
    });
  });
});
