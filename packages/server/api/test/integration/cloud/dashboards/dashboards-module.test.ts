const commonMock = {
  ...jest.requireActual('@openops/common'),
  authenticateOpenOpsAnalyticsAdmin: jest.fn(),
};
jest.mock('@openops/common', () => commonMock);

const getDashboardOverviewObjectMock = {
  getDashboardOverviewObject: jest.fn(),
};
jest.mock(
  '../../../../src/app/dashboards/get-dashboard-overview',
  () => getDashboardOverviewObjectMock,
);

const getWorkflowsStatsMock = {
  getWorkflowsStats: jest.fn().mockResolvedValue({}),
};
jest.mock(
  '../../../../src/app/dashboards/get-workflow-stats',
  () => getWorkflowsStatsMock,
);

import { PrincipalType } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('GET /v1/dashboards/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the expected overview object', async () => {
    const testToken = await generateMockToken({
      type: PrincipalType.USER,
    });
    getDashboardOverviewObjectMock.getDashboardOverviewObject.mockResolvedValue(
      'some result',
    );

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/dashboards/overview',
      headers: { authorization: `Bearer ${testToken}` },
    });

    expect(response?.body).toEqual('some result');
    expect(response?.statusCode).toBe(StatusCodes.OK);

    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledTimes(1);
    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledWith();
  });

  it('should return 404 when overview was not found', async () => {
    const testToken = await generateMockToken({
      type: PrincipalType.USER,
    });
    getDashboardOverviewObjectMock.getDashboardOverviewObject.mockResolvedValue(
      undefined,
    );

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/dashboards/overview',
      headers: { authorization: `Bearer ${testToken}` },
    });

    expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledTimes(1);
    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledWith();
  });

  it('should return 500 when getting dashbboard overview throws', async () => {
    const testToken = await generateMockToken({
      type: PrincipalType.USER,
    });
    getDashboardOverviewObjectMock.getDashboardOverviewObject.mockRejectedValue(
      new Error('some error'),
    );

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/dashboards/overview',
      headers: { authorization: `Bearer ${testToken}` },
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledTimes(1);
    expect(
      getDashboardOverviewObjectMock.getDashboardOverviewObject,
    ).toHaveBeenCalledWith();
  });
});

describe('GET /v1/dashboards/workflows-stats', () => {
  const mockStats = {
    activatedWorkflows: 5,
    totalWorkflows: 10,
    totalRuns: 100,
    successfulRuns: 80,
    failedRuns: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock to successful response by default
    getWorkflowsStatsMock.getWorkflowsStats.mockResolvedValue(mockStats);
  });

  const createMockToken = async (): Promise<string> =>
    generateMockToken({
      type: PrincipalType.USER,
      projectId: 'test-project-id',
    });

  const makeRequest = async ({
    method = 'GET',
    url = '/v1/dashboards/workflows-stats',
    token,
    query = {},
  }: {
    method?: 'GET';
    url?: string;
    token?: string;
    query?: Record<string, string>;
  }) => {
    const queryString = new URLSearchParams(query).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return app?.inject({
      method,
      url: fullUrl,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  };

  it('should require authentication', async () => {
    const response = await makeRequest({});
    expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  it('should return workflow stats for the project', async () => {
    const testToken = await createMockToken();

    const response = await makeRequest({
      token: testToken,
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual(mockStats);
  });

  it('should accept date range parameters', async () => {
    const testToken = await createMockToken();

    const response = await makeRequest({
      token: testToken,
      query: {
        createdAfter: '2025-01-01',
        createdBefore: '2025-12-12',
      },
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
    expect(JSON.parse(response?.body as string)).toEqual(mockStats);
  });

  it('should return 500 when getting stats throws an error', async () => {
    const testToken = await createMockToken();

    getWorkflowsStatsMock.getWorkflowsStats.mockRejectedValue(
      new Error('Database error'),
    );

    const response = await makeRequest({
      token: testToken,
    });

    expect(response?.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
