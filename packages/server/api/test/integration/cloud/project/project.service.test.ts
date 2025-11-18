import { encryptUtils, QueueMode } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { projectService } from '../../../../src/app/project/project-service';
import {
  createMockOrganizationWithOwner,
  createMockProject,
} from '../../../helpers/mocks';

beforeAll(async () => {
  await encryptUtils.loadEncryptionKey(QueueMode.MEMORY);
  await databaseConnection().initialize();
});

afterAll(async () => {
  await databaseConnection().destroy();
});

describe('Project Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const { mockOrganization, mockOwner } = createMockOrganizationWithOwner({
        organization: {
          id: openOpsId(),
          name: 'Test Org',
        },
      });
      await databaseConnection().getRepository('user').save(mockOwner);
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const mockProject = createMockProject({
        ownerId: mockOwner.id,
        organizationId: mockOrganization.id,
      });

      const result = await projectService.create({
        ...mockProject,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token',
      });
      const savedProject = await projectService.getOneOrThrow(result.id);

      expect(savedProject.id).toBe(result.id);
      expect(savedProject.tablesDatabaseId).toBe(123);

      expect(savedProject.ownerId).toBe(mockOwner.id);
      expect(savedProject.organizationId).toBe(mockOrganization.id);
    });
  });

  describe('getProjectIdsByOrganizationId', () => {
    it('should return project IDs for a given organization', async () => {
      const { mockOrganization, mockOwner } = createMockOrganizationWithOwner({
        organization: {
          id: openOpsId(),
          name: 'Test Org',
        },
      });
      await databaseConnection().getRepository('user').save(mockOwner);
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const mockProject1 = createMockProject({
        ownerId: mockOwner.id,
        organizationId: mockOrganization.id,
      });
      const mockProject2 = createMockProject({
        ownerId: mockOwner.id,
        organizationId: mockOrganization.id,
      });

      await projectService.create({
        ...mockProject1,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token',
      });
      await projectService.create({
        ...mockProject2,
        tablesDatabaseId: 124,
        tablesDatabaseToken: 'token',
      });

      const projectIds = await projectService.getProjectIdsByOrganizationId(
        mockOrganization.id,
      );

      expect(projectIds).toHaveLength(2);
      expect(projectIds).toContain(mockProject1.id);
      expect(projectIds).toContain(mockProject2.id);
    });

    it('should return empty array when organization has no projects', async () => {
      const { mockOrganization, mockOwner } = createMockOrganizationWithOwner({
        organization: {
          id: openOpsId(),
          name: 'Empty Org',
        },
      });
      await databaseConnection().getRepository('user').save(mockOwner);
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const projectIds = await projectService.getProjectIdsByOrganizationId(
        mockOrganization.id,
      );

      expect(projectIds).toHaveLength(0);
      expect(projectIds).toEqual([]);
    });

    it('should not return deleted projects', async () => {
      const { mockOrganization, mockOwner } = createMockOrganizationWithOwner({
        organization: {
          id: openOpsId(),
          name: 'Test Org',
        },
      });
      await databaseConnection().getRepository('user').save(mockOwner);
      await databaseConnection()
        .getRepository('organization')
        .save(mockOrganization);

      const mockProject = createMockProject({
        ownerId: mockOwner.id,
        organizationId: mockOrganization.id,
        deleted: new Date().toISOString(),
      });

      await databaseConnection().getRepository('project').save(mockProject);

      const projectIds = await projectService.getProjectIdsByOrganizationId(
        mockOrganization.id,
      );

      expect(projectIds).toHaveLength(0);
      expect(projectIds).not.toContain(mockProject.id);
    });
  });
});
