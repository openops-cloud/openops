import { encryptionKeyInitializer } from '@openops/server-shared';
import {
  FlowVersionState,
  openOpsId,
  PrincipalType,
  Trigger,
} from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockFlow,
  createMockFlowVersion,
  createMockTrigger,
  mockBasicSetup,
} from '../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  await encryptionKeyInitializer();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

describe('Flow Version API', () => {
  describe('POST to update trigger', () => {
    it('Should update trigger', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockFlow = createMockFlow({
        projectId: mockProject.id,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });
      const now = new Date();
      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flow-versions/${mockFlowVersion.id}/trigger`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: {
          flowId: mockFlow.id,
          valid: true,
          updateTimestamp: now.toString(),
          trigger: createMockTrigger(),
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
    });
    it('Should receive an error when trying to update the flowId', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockFlow = createMockFlow({
        projectId: mockProject.id,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });
      const now = new Date();
      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flow-versions/${mockFlowVersion.id}/trigger`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: {
          flowId: openOpsId(),
          valid: true,
          updateTimestamp: now.toString(),
          trigger: createMockTrigger(),
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const responseBody = JSON.parse(response?.body || '{}');
      expect(responseBody?.message).toBe(
        'It is not possible to update the flowId of a flow version',
      );
    });
    it('Should receive an error, when no flow is found in the current project with the given flowId', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockFlow = createMockFlow({
        projectId: mockProject.id,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: openOpsId(),
        type: PrincipalType.USER,
      });
      const now = new Date();
      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flow-versions/${mockFlowVersion.id}/trigger`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: {
          flowId: mockFlow.id,
          valid: true,
          updateTimestamp: now.toString(),
          trigger: createMockTrigger(),
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
      const responseBody = JSON.parse(response?.body || '{}');
      expect(responseBody?.message).toBe(
        'The flow and version are not associated with the project',
      );
    });
  });

  describe('GET flow versions by connection with connection name', () => {
    it('Should return the latest flow versions by connection name', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockFlow = createMockFlow({
        projectId: mockProject.id,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion1 = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
        trigger: {
          settings: {
            input: {
              auth: "{{connections['testConnection']}}",
            },
          },
        } as Trigger,
        created: new Date('2024-12-02').toString(),
      });

      const mockFlowVersion2 = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
        trigger: {
          settings: {
            input: {
              auth: "{{connections['slack']}}",
            },
          },
        } as Trigger,
        created: new Date('2024-12-01').toString(),
      });

      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion1, mockFlowVersion2]);

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flow-versions?connectionName=testConnection`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);

      const responseBody = JSON.parse(response?.body || '[]');
      expect(responseBody).toHaveLength(1);
      expect(responseBody[0]).toEqual(
        expect.objectContaining({
          id: mockFlow.id,
          displayName: mockFlowVersion1.displayName,
        }),
      );
    });

    it('Should return an empty array if no flow versions match the connection name', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flow-versions?connectionName=nonExistentConnection`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);

      const responseBody = JSON.parse(response?.body || '[]');
      expect(responseBody).toHaveLength(0);
    });

    it('Should return an empty array if no flow versions match the projectId', async () => {
      const { mockOwner, mockProject } = await mockBasicSetup();

      const mockFlow = createMockFlow({
        projectId: mockProject.id,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion1 = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
        trigger: {
          settings: {
            input: {
              auth: "{{connections['testConnection']}}",
            },
          },
        } as Trigger,
        created: new Date('2024-12-02').toString(),
      });

      const mockFlowVersion2 = createMockFlowVersion({
        flowId: mockFlow.id,
        state: FlowVersionState.DRAFT,
        trigger: {
          settings: {
            input: {
              auth: "{{connections['slack']}}",
            },
          },
        } as Trigger,
        created: new Date('2024-12-01').toString(),
      });

      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion1, mockFlowVersion2]);

      const mockToken = await generateMockToken({
        id: mockOwner.id,
        projectId: 'anotherProjectId',
        type: PrincipalType.USER,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flow-versions?connectionName=testConnection`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);

      const responseBody = JSON.parse(response?.body || '[]');
      expect(responseBody).toHaveLength(0);
    });
  });
});

describe('POST to update test-output', () => {
  it('Should save the test-output', async () => {
    const { mockOwner, mockProject } = await mockBasicSetup();

    const mockFlow = createMockFlow({
      projectId: mockProject.id,
    });
    await databaseConnection().getRepository('flow').save([mockFlow]);

    const mockFlowVersion = createMockFlowVersion({
      flowId: mockFlow.id,
      state: FlowVersionState.DRAFT,
    });
    await databaseConnection()
      .getRepository('flow_version')
      .save([mockFlowVersion]);

    const mockToken = await generateMockToken({
      id: mockOwner.id,
      projectId: mockProject.id,
      type: PrincipalType.USER,
    });

    const response = await app?.inject({
      method: 'POST',
      url: `/v1/flow-versions/${mockFlowVersion.id}/test-output`,
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
      body: {
        stepId: openOpsId(),
        output: 'expected test output',
        input: {},
        success: true,
      },
    });

    expect(response?.statusCode).toBe(StatusCodes.OK);
  });

  it('Should receive an error when trying to save the test-output', async () => {
    const { mockOwner, mockProject } = await mockBasicSetup();

    const mockToken = await generateMockToken({
      id: mockOwner.id,
      projectId: mockProject.id,
      type: PrincipalType.USER,
    });

    const response = await app?.inject({
      method: 'POST',
      url: `/v1/flow-versions/${openOpsId()}/test-output`,
      headers: {
        authorization: `Bearer ${mockToken}`,
      },
      body: {
        stepId: openOpsId(),
        output: 'expected test output',
        input: {},
        success: true,
      },
    });

    expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
    const responseBody = response?.json();
    expect(responseBody).toMatchObject({
      success: false,
      message: 'The defined flow version was not found',
    });
  });
});
