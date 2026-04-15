import { FlowRunSortBy, PrincipalType, SortDirection } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { databaseConnection } from '../../../../../src/app/database/database-connection';
import { setupServer } from '../../../../../src/app/server';
import { generateMockToken } from '../../../../helpers/auth';
import {
  createMockFlow,
  createMockFlowRun,
  mockBasicSetup,
} from '../../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('List flow runs endpoint', () => {
  it('should return 200', async () => {
    // arrange
    const testToken = await generateMockToken({
      type: PrincipalType.USER,
    });

    // act
    const response = await app?.inject({
      method: 'GET',
      url: '/v1/flow-runs',
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    });

    // assert
    expect(response?.statusCode).toBe(200);
  });

  it('should exclude runs for internal flows', async () => {
    const { mockProject } = await mockBasicSetup();

    const internalFlow = createMockFlow({
      projectId: mockProject.id,
      isInternal: true,
    });
    const externalFlow = createMockFlow({
      projectId: mockProject.id,
      isInternal: false,
    });

    await databaseConnection()
      .getRepository('flow')
      .save([internalFlow, externalFlow]);

    const internalRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: internalFlow.id,
    });
    const externalRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: externalFlow.id,
    });

    await databaseConnection()
      .getRepository('flow_run')
      .save([internalRun, externalRun]);

    const testToken = await generateMockToken({
      type: PrincipalType.USER,
      projectId: mockProject.id,
    });

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/flow-runs',
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    });

    expect(response?.statusCode).toBe(200);
    const body = response?.json();
    const ids = body?.data?.map((r: { id: string }) => r.id) ?? [];
    expect(ids).toContain(externalRun.id);
    expect(ids).not.toContain(internalRun.id);
  });

  it('should sort runs by flow name', async () => {
    const { mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({
      projectId: mockProject.id,
      isInternal: false,
    });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const betaRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: mockFlow.id,
      flowDisplayName: 'Beta run',
    });
    const alphaRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: mockFlow.id,
      flowDisplayName: 'Alpha run',
    });
    await databaseConnection()
      .getRepository('flow_run')
      .save([betaRun, alphaRun]);

    const testToken = await generateMockToken({
      type: PrincipalType.USER,
      projectId: mockProject.id,
    });

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/flow-runs',
      query: {
        sortBy: FlowRunSortBy.FLOW_NAME,
        sortDirection: SortDirection.ASC,
      },
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    });

    expect(response?.statusCode).toBe(200);
    const body = response?.json();
    expect(body?.data?.[0]?.flowDisplayName).toBe('Alpha run');
    expect(body?.data?.[1]?.flowDisplayName).toBe('Beta run');
  });

  it('should use default sorting when sorting is not provided', async () => {
    const { mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({
      projectId: mockProject.id,
      isInternal: false,
    });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const olderRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: mockFlow.id,
      created: '2024-01-01T00:00:00.000Z',
    });
    const newerRun = createMockFlowRun({
      projectId: mockProject.id,
      flowId: mockFlow.id,
      created: '2024-01-02T00:00:00.000Z',
    });
    await databaseConnection()
      .getRepository('flow_run')
      .save([olderRun, newerRun]);

    const testToken = await generateMockToken({
      type: PrincipalType.USER,
      projectId: mockProject.id,
    });

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/flow-runs',
      headers: {
        authorization: `Bearer ${testToken}`,
      },
    });

    expect(response?.statusCode).toBe(200);
    const body = response?.json();
    expect(body?.data?.[0]?.id).toBe(newerRun.id);
    expect(body?.data?.[1]?.id).toBe(olderRun.id);
  });
});
