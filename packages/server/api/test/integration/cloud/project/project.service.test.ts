import { encryptUtils } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { projectService } from '../../../../src/app/project/project-service';
import {
  createMockOrganizationWithOwner,
  createMockProject,
} from '../../../helpers/mocks';

beforeAll(async () => {
  encryptUtils.loadEncryptionKey();
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

  describe('getOneForOrganization', () => {
    it('should return the oldest project when multiple projects exist', async () => {
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
      const mockProject3 = createMockProject({
        ownerId: mockOwner.id,
        organizationId: mockOrganization.id,
      });

      const firstProject = await projectService.create({
        ...mockProject1,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token1',
      });

      const secondProject = await projectService.create({
        ...mockProject2,
        tablesDatabaseId: 124,
        tablesDatabaseToken: 'token2',
      });

      const thirdProject = await projectService.create({
        ...mockProject3,
        tablesDatabaseId: 125,
        tablesDatabaseToken: 'token3',
      });

      const now = new Date();
      await databaseConnection()
        .getRepository('project')
        .update(
          { id: firstProject.id },
          { created: new Date(now.getTime() - 3000).toISOString() },
        );
      await databaseConnection()
        .getRepository('project')
        .update(
          { id: secondProject.id },
          { created: new Date(now.getTime() - 2000).toISOString() },
        );
      await databaseConnection()
        .getRepository('project')
        .update(
          { id: thirdProject.id },
          { created: new Date(now.getTime() - 1000).toISOString() },
        );

      const result = await projectService.getOneForOrganization(
        mockOrganization.id,
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(firstProject.id);
      expect(result?.tablesDatabaseId).toBe(123);
    });

    it('should return null when organization has no projects', async () => {
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

      const result = await projectService.getOneForOrganization(
        mockOrganization.id,
      );

      expect(result).toBeNull();
    });

    it('should return null when organization does not exist', async () => {
      const nonExistentOrgId = openOpsId();

      const result = await projectService.getOneForOrganization(
        nonExistentOrgId,
      );

      expect(result).toBeNull();
    });

    it('should ignore deleted projects', async () => {
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

      const firstProject = await projectService.create({
        ...mockProject1,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token1',
      });

      const secondProject = await projectService.create({
        ...mockProject2,
        tablesDatabaseId: 124,
        tablesDatabaseToken: 'token2',
      });

      const now = new Date();
      await databaseConnection()
        .getRepository('project')
        .update(
          { id: firstProject.id },
          { created: new Date(now.getTime() - 2000).toISOString() },
        );
      await databaseConnection()
        .getRepository('project')
        .update(
          { id: secondProject.id },
          { created: new Date(now.getTime() - 1000).toISOString() },
        );

      await databaseConnection()
        .getRepository('project')
        .update({ id: firstProject.id }, { deleted: new Date().toISOString() });

      const result = await projectService.getOneForOrganization(
        mockOrganization.id,
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(secondProject.id);
      expect(result?.tablesDatabaseId).toBe(124);
    });

    it('should return null when all projects are deleted', async () => {
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

      const createdProject = await projectService.create({
        ...mockProject,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token1',
      });

      await databaseConnection()
        .getRepository('project')
        .update(
          { id: createdProject.id },
          { deleted: new Date().toISOString() },
        );

      const result = await projectService.getOneForOrganization(
        mockOrganization.id,
      );

      expect(result).toBeNull();
    });

    it('should return the project from the correct organization', async () => {
      const { mockOrganization: org1, mockOwner: owner1 } =
        createMockOrganizationWithOwner({
          organization: {
            id: openOpsId(),
            name: 'Org 1',
          },
        });
      const { mockOrganization: org2, mockOwner: owner2 } =
        createMockOrganizationWithOwner({
          organization: {
            id: openOpsId(),
            name: 'Org 2',
          },
        });

      await databaseConnection().getRepository('user').save(owner1);
      await databaseConnection().getRepository('user').save(owner2);
      await databaseConnection().getRepository('organization').save(org1);
      await databaseConnection().getRepository('organization').save(org2);

      const projectOrg1 = createMockProject({
        ownerId: owner1.id,
        organizationId: org1.id,
      });
      const projectOrg2 = createMockProject({
        ownerId: owner2.id,
        organizationId: org2.id,
      });

      const createdProjectOrg1 = await projectService.create({
        ...projectOrg1,
        tablesDatabaseId: 123,
        tablesDatabaseToken: 'token1',
      });

      await projectService.create({
        ...projectOrg2,
        tablesDatabaseId: 124,
        tablesDatabaseToken: 'token2',
      });

      const result = await projectService.getOneForOrganization(org1.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(createdProjectOrg1.id);
      expect(result?.organizationId).toBe(org1.id);
    });
  });
});
