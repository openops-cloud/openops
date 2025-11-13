import { ApplicationError, openOpsId, Organization } from '@openops/shared';
import { databaseConnection } from '../../../../src/app/database/database-connection';
import { organizationService } from '../../../../src/app/organization/organization.service';
import { userService } from '../../../../src/app/user/user-service';
import {
  createMockOrganizationWithOwner,
  createMockUser,
} from '../../../helpers/mocks';

beforeAll(async () => {
  await databaseConnection().initialize();
});

afterAll(async () => {
  await databaseConnection().destroy();
});

describe('Organization Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('hasAnyOrganizations', () => {
    it('should return false if there are no organizations', async () => {
      const result = await organizationService.hasAnyOrganizations();

      expect(result).toBe(false);
    });

    it('should return true if there are organizations', async () => {
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

      const result = await organizationService.hasAnyOrganizations();

      expect(result).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new organization and add the owner to it', async () => {
      const { mockOrganization, mockOwner } = createMockOrganizationWithOwner({
        organization: {
          id: openOpsId(),
          name: 'Test Org',
        },
      });

      mockOwner.organizationId = null;
      await databaseConnection().getRepository('user').save(mockOwner);
      expect(mockOwner.organizationId).toBeNull();

      const result = await organizationService.create({
        ownerId: mockOrganization.ownerId,
        name: mockOrganization.name,
      });

      const savedOrganization = await organizationService.getOneOrThrow(
        result.id,
      );

      expect(savedOrganization.id).toBe(result.id);

      const savedUser = await userService.getOneOrFail({
        id: mockOrganization.ownerId,
      });

      expect(savedOrganization.ownerId).toBe(savedUser.id);
      expect(savedUser.organizationId).toBe(savedOrganization.id);
    });
  });

  describe('update', () => {
    it('should update the organization name', async () => {
      const mockOrganization = await createOrganizationInDB();
      let savedOrganization = await organizationService.getOneOrThrow(
        mockOrganization.id,
      );
      expect(savedOrganization.name).toBe('Test Org');

      await organizationService.update({
        id: mockOrganization.id,
        name: 'Test Org 2',
      });

      savedOrganization = await organizationService.getOneOrThrow(
        mockOrganization.id,
      );
      expect(savedOrganization.name).toBe('Test Org 2');
    });

    it('should update the organization ownerId', async () => {
      const user = createMockUser();
      await databaseConnection().getRepository('user').save(user);

      const mockOrganization = await createOrganizationInDB();
      let savedOrganization = await organizationService.getOneOrThrow(
        mockOrganization.id,
      );
      expect(savedOrganization.ownerId).toBe(mockOrganization.ownerId);

      await organizationService.update({
        id: mockOrganization.id,
        ownerId: user.id,
      });

      savedOrganization = await organizationService.getOneOrThrow(
        mockOrganization.id,
      );
      expect(savedOrganization.ownerId).toBe(user.id);
    });

    it('should throw an error if the organization does not exist', async () => {
      await expect(
        organizationService.update({ id: 'orgId', name: 'New Name' }),
      ).rejects.toThrow(ApplicationError);
    });
  });
});

async function createOrganizationInDB(): Promise<Organization> {
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

  return mockOrganization;
}
