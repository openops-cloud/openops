const resolveWizardNavigationMock = jest.fn();
jest.mock(
  '../../../../src/app/benchmark/wizard.service',
  (): {
    resolveWizardNavigation: (...args: unknown[]) => unknown;
  } => ({
    resolveWizardNavigation: (...args: unknown[]) =>
      resolveWizardNavigationMock(...args),
  }),
);

const flagServiceMock = {
  getOne: jest.fn(),
};
jest.mock('../../../../src/app/flags/flag.service', () => ({
  flagService: flagServiceMock,
}));

import {
  ApplicationError,
  type BenchmarkWizardStepResponse,
  ErrorCode,
  Organization,
  PrincipalType,
  Project,
  User,
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
  currentStep: 'mock-step',
  title: 'Mock step',
  nextStep: 'next-step',
  selectionType: 'single',
  options: [],
  stepIndex: 1,
  totalSteps: 3,
};

let app: FastifyInstance | null = null;

beforeAll(async () => {
  resolveWizardNavigationMock.mockResolvedValue(mockWizardStep);
  flagServiceMock.getOne.mockResolvedValue({ value: true });
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Benchmark wizard API', () => {
  const createAndInsertMocks = async (options?: {
    principalType?: PrincipalType;
  }): Promise<{
    token: string;
    user: User;
    organization: Organization;
    project: Project;
  }> => {
    const mockUser = createMockUser();
    await databaseConnection().getRepository('user').save([mockUser]);

    const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
    await databaseConnection()
      .getRepository('organization')
      .save(mockOrganization);

    await databaseConnection().getRepository('user').update(mockUser.id, {
      organizationId: mockOrganization.id,
    });

    const mockProject = createMockProject({
      ownerId: mockUser.id,
      organizationId: mockOrganization.id,
    });
    await databaseConnection().getRepository('project').save([mockProject]);

    const mockToken = await generateMockToken({
      id: mockUser.id,
      type: options?.principalType ?? PrincipalType.USER,
      projectId: mockProject.id,
      organization: { id: mockOrganization.id },
    });

    return {
      token: mockToken,
      user: mockUser,
      organization: mockOrganization,
      project: mockProject,
    };
  };

  const postWizard = async ({
    provider = 'aws',
    token,
    body = {},
  }: {
    provider?: string;
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
      resolveWizardNavigationMock.mockResolvedValue(mockWizardStep);
      flagServiceMock.getOne.mockResolvedValue({ value: true });
    });

    it('calls resolveWizardNavigation with provider, body, and projectId and returns mocked step', async () => {
      const { token, project } = await createAndInsertMocks();
      const body = {};

      const response = await postWizard({ token, body });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual(mockWizardStep);
      expect(resolveWizardNavigationMock).toHaveBeenCalledTimes(1);
      expect(resolveWizardNavigationMock).toHaveBeenCalledWith(
        'aws',
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

      const response = await postWizard({ token, body });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(response?.json()).toEqual(mockWizardStep);
      expect(resolveWizardNavigationMock).toHaveBeenCalledWith(
        'aws',
        {
          currentStep: 'connection',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        project.id,
      );
    });

    it('passes provider from URL params to resolveWizardNavigation', async () => {
      const { token, project } = await createAndInsertMocks();

      await postWizard({ provider: 'gcp', token, body: {} });

      expect(resolveWizardNavigationMock).toHaveBeenCalledWith(
        'gcp',
        expect.any(Object),
        project.id,
      );
    });

    it('returns 409 with VALIDATION code when resolveWizardNavigation throws', async () => {
      resolveWizardNavigationMock.mockRejectedValue(
        new ApplicationError(
          {
            code: ErrorCode.VALIDATION,
            params: { message: 'Unknown provider' },
          },
          'Unknown provider',
        ),
      );
      const { token } = await createAndInsertMocks();

      const response = await postWizard({ token, body: {} });

      expect(response?.statusCode).toBe(StatusCodes.CONFLICT);
      const data = response?.json();
      expect(data?.code).toBe('VALIDATION');
      expect(data?.params).toBeDefined();
    });

    it('returns 402 when FINOPS_BENCHMARK_ENABLED flag is disabled', async () => {
      flagServiceMock.getOne.mockResolvedValue({ value: false });
      resolveWizardNavigationMock.mockClear();

      const { token } = await createAndInsertMocks();
      const response = await postWizard({ token, body: {} });

      expect(response?.statusCode).toBe(StatusCodes.PAYMENT_REQUIRED);
      const data = response?.json();
      expect(data?.code).toBe('FEATURE_DISABLED');
      expect(data?.params).toBeDefined();
      expect(resolveWizardNavigationMock).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      resolveWizardNavigationMock.mockClear();

      const response = await postWizard({ body: {} });

      expect(response?.statusCode).toBe(StatusCodes.UNAUTHORIZED);
      expect(resolveWizardNavigationMock).not.toHaveBeenCalled();
    });
  });
});
