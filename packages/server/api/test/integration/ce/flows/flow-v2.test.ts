import {
  ActionType,
  BlockType,
  FlowOperationType,
  FlowStatus,
  FlowVersionState,
  openOpsId,
  PackageType,
  PrincipalType,
  TriggerType,
} from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { setupServer } from '../../../../src/app/server';
import { generateMockToken } from '../../../helpers/auth';
import {
  createMockFlow,
  createMockFlowVersion,
  createMockOrganization,
  createMockProject,
  createMockUser,
} from '../../../helpers/mocks';

let app: FastifyInstance | null = null;

beforeAll(async () => {
  await databaseConnection().initialize();
  app = await setupServer();
});

afterAll(async () => {
  await databaseConnection().destroy();
});

describe('Flow V2 API', () => {
  describe('POST /v2/flows/:id/steps - Add Step endpoint', () => {
    it('Should add a new step to a flow', async () => {
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
        id: mockUser.id,
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });

      const addStepRequest = {
        parentStep: 'trigger',
        action: {
          name: 'new_step',
          type: ActionType.BLOCK,
          displayName: 'HTTP Request',
          settings: {
            input: {
              url: 'https://api.example.com',
              method: 'GET',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: '@openops/block-http',
            blockVersion: '0.2.0',
            actionName: 'send_request',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          valid: true,
        },
      };

      const response = await app?.inject({
        method: 'POST',
        url: `/v2/flows/${mockFlow.id}/steps`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: addStepRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(responseBody?.id).toBe(mockFlow.id);
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.version?.trigger?.nextAction).toBeDefined();
      expect(responseBody?.version?.trigger?.nextAction?.name).toBe('new_step');
      expect(responseBody?.version?.trigger?.nextAction?.type).toBe(
        ActionType.BLOCK,
      );
      expect(responseBody?.version?.trigger?.nextAction?.displayName).toBe(
        'HTTP Request',
      );
    });

    it('Should return 404 for non-existent flow', async () => {
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
        projectId: mockProject.id,
        type: PrincipalType.USER,
      });

      const nonExistentFlowId = openOpsId();

      const addStepRequest = {
        parentStep: 'trigger',
        action: {
          name: 'new_step',
          type: ActionType.CODE,
          displayName: 'Code Step',
          settings: {
            input: {},
            sourceCode: {
              code: 'console.log("Hello World");',
              packageJson: '{}',
            },
          },
          valid: true,
        },
      };

      const response = await app?.inject({
        method: 'POST',
        url: `/v2/flows/${nonExistentFlowId}/steps`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: addStepRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
    });

    it('Should return 403 for flow in different project', async () => {
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

      const differentProjectId = openOpsId();
      const mockToken = await generateMockToken({
        id: mockUser.id,
        projectId: differentProjectId,
        type: PrincipalType.USER,
      });

      const addStepRequest = {
        parentStep: 'trigger',
        action: {
          name: 'new_step',
          type: ActionType.CODE,
          displayName: 'Code Step',
          settings: {
            input: {},
            sourceCode: {
              code: 'console.log("Hello World");',
              packageJson: '{}',
            },
          },
          valid: true,
        },
      };

      const response = await app?.inject({
        method: 'POST',
        url: `/v2/flows/${mockFlow.id}/steps`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: addStepRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.FORBIDDEN);
    });
  });
});
