import {
  FlowOperationType,
  FlowStatus,
  FlowTemplateDto,
  FlowVersionState,
  openOpsId,
  PrincipalType,
  TemplateType,
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
  createMockFolder,
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
  await app?.close();
});

describe('Flow API', () => {
  describe('Create Flow endpoint', () => {
    it('Adds an empty flow', async () => {
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
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const mockCreateFlowRequest = {
        displayName: 'test flow',
        projectId: mockProject.id,
      };

      const response = await app?.inject({
        method: 'POST',
        url: '/v1/flows',
        query: {
          projectId: mockProject.id,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: mockCreateFlowRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.CREATED);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toHaveLength(21);
      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBeNull();
      expect(responseBody?.status).toBe('DISABLED');
      expect(responseBody?.publishedVersionId).toBeNull();
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toHaveLength(21);
      expect(responseBody?.version?.created).toBeDefined();
      expect(responseBody?.version?.updated).toBeDefined();
      expect(responseBody?.version?.updatedBy).toBeNull();
      expect(responseBody?.version?.flowId).toBe(responseBody?.id);
      expect(responseBody?.version?.displayName).toBe('test flow');
      expect(Object.keys(responseBody?.version?.trigger)).toHaveLength(6);
      expect(responseBody?.version?.trigger.type).toBe('EMPTY');
      expect(responseBody?.version?.trigger.name).toBe('trigger');
      expect(responseBody?.version?.trigger.settings).toMatchObject({});
      expect(responseBody?.version?.trigger.valid).toBe(false);
      expect(responseBody?.version?.trigger.displayName).toBe('Select Trigger');
      expect(responseBody?.version?.valid).toBe(false);
      expect(responseBody?.version?.state).toBe('DRAFT');
    });

    it('Adds a flow based on a template', async () => {
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

      const flowTemplate = await createMockFlowTemplate({
        projectId: mockProject.id,
        organizationId: mockOrganization.id,
      });

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
        id: mockUser.id,
      });

      const mockCreateFlowRequest = {
        template: {
          id: flowTemplate.id,
          displayName: flowTemplate.name,
          description: flowTemplate.description,
          trigger: flowTemplate.template,
          isSample: flowTemplate.isSample,
        },
        connectionIds: [],
      };

      const response = await app?.inject({
        method: 'POST',
        url: '/v1/flows',
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: mockCreateFlowRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.CREATED);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toHaveLength(21);

      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBeNull();
      expect(responseBody?.status).toBe('DISABLED');
      expect(responseBody?.publishedVersionId).toBeNull();
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toHaveLength(21);
      expect(responseBody?.version?.created).toBeDefined();
      expect(responseBody?.version?.updated).toBeDefined();
      expect(responseBody?.version?.updatedBy).toBe(mockUser.id);
      expect(responseBody?.version?.flowId).toBe(responseBody?.id);
      expect(responseBody?.version?.displayName).toBe('test template');
      expect(responseBody?.version?.description).toBe('A test template');
      expect(Object.keys(responseBody?.version?.trigger)).toHaveLength(6);
      expect(responseBody?.version?.trigger.type).toBe('EMPTY');
      expect(responseBody?.version?.trigger.name).toBe('trigger');
      expect(responseBody?.version?.trigger.settings).toMatchObject({});
      expect(responseBody?.version?.trigger.valid).toBe(false);
      expect(responseBody?.version?.trigger.displayName).toBe('Select Trigger');
      expect(responseBody?.version?.valid).toBe(false);
      expect(responseBody?.version?.state).toBe('DRAFT');
    });

    it('Adds an empty flow in a folder', async () => {
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

      const mockFolder = createMockFolder(mockProject.id);
      await databaseConnection().getRepository('folder').save([mockFolder]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const mockCreateFlowRequest = {
        displayName: 'test flow',
        projectId: mockProject.id,
        folderId: mockFolder.id,
      };

      const response = await app?.inject({
        method: 'POST',
        url: '/v1/flows',
        query: {
          projectId: mockProject.id,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: mockCreateFlowRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.CREATED);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toHaveLength(21);
      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBe(mockFolder.id);
      expect(responseBody?.status).toBe('DISABLED');
      expect(responseBody?.publishedVersionId).toBeNull();
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toHaveLength(21);
      expect(responseBody?.version?.created).toBeDefined();
      expect(responseBody?.version?.updated).toBeDefined();
      expect(responseBody?.version?.updatedBy).toBeNull();
      expect(responseBody?.version?.flowId).toBe(responseBody?.id);
      expect(responseBody?.version?.displayName).toBe('test flow');
      expect(Object.keys(responseBody?.version?.trigger)).toHaveLength(6);
      expect(responseBody?.version?.trigger.type).toBe('EMPTY');
      expect(responseBody?.version?.trigger.name).toBe('trigger');
      expect(responseBody?.version?.trigger.settings).toMatchObject({});
      expect(responseBody?.version?.trigger.valid).toBe(false);
      expect(responseBody?.version?.trigger.displayName).toBe('Select Trigger');
      expect(responseBody?.version?.valid).toBe(false);
      expect(responseBody?.version?.state).toBe('DRAFT');
    });
  });

  describe('Update status endpoint', () => {
    it('Enables a disabled Flow', async () => {
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
        status: FlowStatus.DISABLED,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      await databaseConnection().getRepository('flow').update(mockFlow.id, {
        publishedVersionId: mockFlowVersion.id,
      });

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const mockUpdateFlowStatusRequest = {
        type: FlowOperationType.CHANGE_STATUS,
        request: {
          status: 'ENABLED',
        },
      };

      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flows/${mockFlow.id}`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: mockUpdateFlowStatusRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toBe(mockFlow.id);
      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBeNull();
      expect(responseBody?.status).toBe('ENABLED');
      expect(responseBody?.publishedVersionId).toBe(mockFlowVersion.id);
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toBe(mockFlowVersion.id);
    });

    it('Disables an enabled Flow', async () => {
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
        status: FlowStatus.ENABLED,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      await databaseConnection().getRepository('flow').update(mockFlow.id, {
        publishedVersionId: mockFlowVersion.id,
      });

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const mockUpdateFlowStatusRequest = {
        type: FlowOperationType.CHANGE_STATUS,
        request: {
          status: 'DISABLED',
        },
      };

      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flows/${mockFlow.id}`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        body: mockUpdateFlowStatusRequest,
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toBe(mockFlow.id);
      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBeNull();
      expect(responseBody?.status).toBe('DISABLED');
      expect(responseBody?.publishedVersionId).toBe(mockFlowVersion.id);
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toBe(mockFlowVersion.id);
    });
  });

  describe('Update published version id endpoint', () => {
    it('Publishes latest draft version', async () => {
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
        status: FlowStatus.DISABLED,
      });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
        state: FlowVersionState.DRAFT,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        id: mockUser.id,
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'POST',
        url: `/v1/flows/${mockFlow.id}`,
        body: {
          type: FlowOperationType.LOCK_AND_PUBLISH,
          request: {},
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(Object.keys(responseBody)).toHaveLength(9);
      expect(responseBody?.id).toBe(mockFlow.id);
      expect(responseBody?.created).toBeDefined();
      expect(responseBody?.updated).toBeDefined();
      expect(responseBody?.projectId).toBe(mockProject.id);
      expect(responseBody?.folderId).toBeNull();
      expect(responseBody?.status).toBe('ENABLED');
      expect(responseBody?.publishedVersionId).toBe(mockFlowVersion.id);
      expect(responseBody?.schedule).toBeNull();

      expect(Object.keys(responseBody?.version)).toHaveLength(10);
      expect(responseBody?.version?.id).toBe(mockFlowVersion.id);
      expect(responseBody?.version?.state).toBe('LOCKED');
    });
  });

  describe('List Flows endpoint', () => {
    it('Filters Flows by status', async () => {
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

      const mockEnabledFlow = createMockFlow({
        projectId: mockProject.id,
        status: FlowStatus.ENABLED,
      });
      const mockDisabledFlow = createMockFlow({
        projectId: mockProject.id,
        status: FlowStatus.DISABLED,
      });
      await databaseConnection()
        .getRepository('flow')
        .save([mockEnabledFlow, mockDisabledFlow]);

      const mockEnabledFlowVersion = createMockFlowVersion({
        flowId: mockEnabledFlow.id,
      });
      const mockDisabledFlowVersion = createMockFlowVersion({
        flowId: mockDisabledFlow.id,
      });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockEnabledFlowVersion, mockDisabledFlowVersion]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/flows',
        query: {
          projectId: mockProject.id,
          status: 'ENABLED',
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(responseBody.data).toHaveLength(1);
      expect(responseBody.data[0].id).toBe(mockEnabledFlow.id);
    });

    it('Populates Flow version', async () => {
      const mockUser = createMockUser();
      await databaseConnection().getRepository('user').save([mockUser]);

      const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const mockProject = createMockProject({
        organizationId: mockOrganization.id,
        ownerId: mockUser.id,
      });
      await databaseConnection().getRepository('project').save([mockProject]);

      const mockFlow = createMockFlow({ projectId: mockProject.id });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockFlowVersion = createMockFlowVersion({ flowId: mockFlow.id });
      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: '/v1/flows',
        query: {
          projectId: mockProject.id,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();

      expect(responseBody?.data).toHaveLength(1);
      expect(responseBody?.data?.[0]?.id).toBe(mockFlow.id);
      expect(responseBody?.data?.[0]?.version?.id).toBe(mockFlowVersion.id);
    });

    it('Fails if a flow with no version exists', async () => {
      const mockUser = createMockUser();
      await databaseConnection().getRepository('user').save([mockUser]);

      const mockOrganization = createMockOrganization({ ownerId: mockUser.id });
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const mockProject = createMockProject({
        organizationId: mockOrganization.id,
        ownerId: mockUser.id,
      });
      await databaseConnection().getRepository('project').save([mockProject]);

      const mockFlow = createMockFlow({ projectId: mockProject.id });
      await databaseConnection().getRepository('flow').save([mockFlow]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${mockFlow.id}`,
        query: {
          projectId: mockProject.id,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
      const responseBody = response?.json();

      expect(responseBody?.code).toBe('ENTITY_NOT_FOUND');
      expect(responseBody?.params?.entityType).toBe('FlowVersion');
      expect(responseBody?.params?.message).toBe(`flowId=${mockFlow.id}`);
    });
  });

  describe('Get Flow Template endpoint', () => {
    it('Gets flow template without version id (uses latest version)', async () => {
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

      // Create older version
      const mockOlderFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
        displayName: 'older version',
        created: '2024-01-01',
      });

      // Create newer version
      const mockLatestFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
        displayName: 'latest version',
        created: '2024-01-02',
      });

      await databaseConnection()
        .getRepository('flow_version')
        .save([mockOlderFlowVersion, mockLatestFlowVersion]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${mockFlow.id}/template`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();
      expect(responseBody).toBeDefined();
      expect(responseBody.template.displayName).toBe('latest version');
    });

    it('Gets flow template with specific version id (ignores latest)', async () => {
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

      // Create older version we want to retrieve
      const mockOlderFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
        displayName: 'older version',
        created: '2024-01-01',
      });

      // Create newer version that should be ignored
      const mockLatestFlowVersion = createMockFlowVersion({
        flowId: mockFlow.id,
        updatedBy: mockUser.id,
        displayName: 'latest version',
        created: '2024-01-02',
      });

      await databaseConnection()
        .getRepository('flow_version')
        .save([mockOlderFlowVersion, mockLatestFlowVersion]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${mockFlow.id}/template`,
        query: {
          versionId: mockOlderFlowVersion.id,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();
      expect(responseBody).toBeDefined();
      expect(responseBody.template.displayName).toBe('older version');
    });

    it('Gets flow template with customized imputs', async () => {
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
        updatedBy: mockUser.id,
        displayName: 'flow version',
        created: '2024-01-01',
      });

      mockFlowVersion.trigger.settings.inputUiInfo = {
        customizedInputs: {
          'input-1': {
            value: true,
          },
          'input-2': {
            value: false,
          },
        },
      };

      await databaseConnection()
        .getRepository('flow_version')
        .save([mockFlowVersion]);

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${mockFlow.id}/template`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.OK);
      const responseBody = response?.json();
      expect(responseBody).toBeDefined();
      expect(responseBody.template.displayName).toBe('flow version');
      expect(responseBody.template.trigger.settings.inputUiInfo).toBeDefined();
      expect(
        responseBody.template.trigger.settings.inputUiInfo.customizedInputs,
      ).toBeDefined();
      expect(
        responseBody.template.trigger.settings.inputUiInfo.customizedInputs,
      ).toMatchObject({
        'input-1': {
          value: true,
        },
        'input-2': {
          value: false,
        },
      });
    });

    it('Returns 400 for non-existent flow', async () => {
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
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const nonExistentFlowId = 'non-existent-id';

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${nonExistentFlowId}/template`,
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const responseBody = response?.json();

      expect(responseBody?.code).toBe(undefined);
    });

    it('Returns 404 for non-existent version id', async () => {
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

      const mockToken = await generateMockToken({
        type: PrincipalType.USER,
        projectId: mockProject.id,
      });

      const nonExistentVersionId = 'non-existent-version-id';

      const response = await app?.inject({
        method: 'GET',
        url: `/v1/flows/${mockFlow.id}/template`,
        query: {
          versionId: nonExistentVersionId,
        },
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      });

      expect(response?.statusCode).toBe(StatusCodes.NOT_FOUND);
      const responseBody = response?.json();
      expect(responseBody?.code).toBe('ENTITY_NOT_FOUND');
    });
  });
});

async function createMockFlowTemplate(
  params: Partial<FlowTemplateDto> = {},
): Promise<FlowTemplateDto> {
  const mockTemplate: FlowTemplateDto = {
    id: openOpsId(),
    name: 'test template',
    description: 'A test template',
    projectId: params.projectId ?? openOpsId(),
    organizationId: params.organizationId ?? openOpsId(),
    services: ['ECS', 'EC2'],
    template: params.template || {
      type: TriggerType.EMPTY,
      name: 'trigger',
      settings: {},
      valid: false,
      displayName: 'Select Trigger',
    },
    domains: ['FinOps'],
    tags: ['test'],
    type: TemplateType.ORGANIZATION,
    blocks: ['test-block'],
    updated: new Date().toISOString(),
    created: new Date().toISOString(),
    isSample: false,
  };

  return mockTemplate;
}
