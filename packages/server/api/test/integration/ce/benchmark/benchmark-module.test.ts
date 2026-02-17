const wizardServiceMock = {
  resolveWizardNavigation: jest.fn(),
};
jest.mock(
  '../../../../src/app/benchmark/wizard.service',
  () => wizardServiceMock,
);

const flagServiceMock = {
  getOne: jest.fn(),
};
jest.mock('../../../../src/app/flags/flag.service', () => ({
  flagService: flagServiceMock,
}));

import {
  ApplicationError,
  BenchmarkProviders,
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

let app: FastifyInstance | null = null;

beforeAll(async () => {
  wizardServiceMock.resolveWizardNavigation.mockResolvedValue(mockWizardStep);
  flagServiceMock.getOne.mockResolvedValue({ value: true });
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Benchmark wizard API', () => {
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
      flagServiceMock.getOne.mockResolvedValue({ value: true });
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
      flagServiceMock.getOne.mockResolvedValue({ value: false });
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
