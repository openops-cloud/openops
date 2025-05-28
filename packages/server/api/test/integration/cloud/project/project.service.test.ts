import { openOpsId } from '@openops/shared';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { projectService } from '../../../../src/app/project/project-service';
import {
  createMockOrganizationWithOwner,
  createMockProject,
} from '../../../helpers/mocks';

beforeAll(async () => {
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
      });
      const savedProject = await projectService.getOneOrThrow(result.id);

      expect(savedProject.id).toBe(result.id);
      expect(savedProject.tablesDatabaseId).toBe(123);

      expect(savedProject.ownerId).toBe(mockOwner.id);
      expect(savedProject.organizationId).toBe(mockOrganization.id);
    });
  });
});
