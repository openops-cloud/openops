import {
  FlowOperationType,
  FlowVersionState,
  ImportFlowRequest,
  openOpsId,
  PrincipalType,
  Trigger,
  validateTriggerImport,
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

jest.mock('@openops/shared', () => {
  const original = jest.requireActual('@openops/shared');
  return {
    ...original,
    validateTriggerImport: jest.fn(),
  };
});

const mockValidateTriggerImport = validateTriggerImport as jest.Mock;

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
  await app?.close();
});

beforeEach(() => {
  mockValidateTriggerImport.mockReturnValue({ success: true });
});

afterEach(() => {
  jest.clearAllMocks();
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
          authorization: `******        },
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
          authorization: `******        },
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
          authorization: `******        },
        body: {
          flowId: mockFlow.id,
          valid: true,
          updateTimestamp: now.toString(),
          trigger: createMockTrigger(),
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const responseBody = JSON.parse(response?.body || '{}');
      expect(responseBody?.message).toBe(
        'The flow and version are not associated with the project',
      );
    });
  });

  describe('Flow version operations', () => {
    it('Should validate trigger import when importing a flow', async () => {
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

      const mockTrigger = createMockTrigger();
      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flow-versions/${mockFlowVersion.id}/operations`,
        headers: {
          authorization: `******        },
        body: {
          type: FlowOperationType.IMPORT_FLOW,
          request: {
            displayName: 'Imported Workflow',
            description: 'An imported workflow',
            trigger: mockTrigger,
          } as ImportFlowRequest,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      expect(mockValidateTriggerImport).toHaveBeenCalledWith(mockTrigger);
    });

    it('Should return validation error when trigger import is invalid', async () => {
      mockValidateTriggerImport.mockReturnValue({
        success: false,
        errors: ['Invalid structure', 'Missing required fields'],
      });

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

      const invalidTrigger = {
        type: 'EMPTY',
      } as Trigger;

      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flow-versions/${mockFlowVersion.id}/operations`,
        headers: {
          authorization: `******        },
        body: {
          type: FlowOperationType.IMPORT_FLOW,
          request: {
            displayName: 'Invalid Workflow',
            description: 'A workflow with invalid structure',
            trigger: invalidTrigger,
          } as ImportFlowRequest,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const responseBody = JSON.parse(response?.body || '{}');
      expect(responseBody.message).toContain('Invalid workflow structure');
      expect(responseBody.message).toContain('Invalid structure, Missing required fields');
      expect(mockValidateTriggerImport).toHaveBeenCalledWith(invalidTrigger);
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
          authorization: `******        },
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
          authorization: `******        },
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
          authorization: `******        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);

      const responseBody = JSON.parse(response?.body || '[]');
      expect(responseBody).toHaveLength(0);
    });
  });
});
