const getProjectPermissionsMock = jest.fn();
const findOneByMock = jest.fn();
jest.mock('../../../src/app/user/project-permissions-service-factory', () => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getProjectPermissionsService: () => ({
    getProjectPermissions: getProjectPermissionsMock,
  }),
}));

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
  }),
}));

import { OrganizationRole, Principal, PrincipalType } from '@openops/shared';
import { userService } from '../../../src/app/user/user-service';

describe('userService.getMetaInfo', () => {
  const mockPrincipal: Principal = {
    id: 'user-id-1',
    type: PrincipalType.USER,
    projectId: 'project-id-123',
    organization: {
      id: 'org-id-1',
    },
  };

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    trackEvents: true,
    organizationId: 'org-id-1',
    organizationRole: OrganizationRole.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user meta with projectId from principal', async () => {
    findOneByMock.mockResolvedValue(mockUser);
    getProjectPermissionsMock.mockResolvedValue({
      analytics: false,
    });

    const result = await userService.getMetaInfo({
      principal: mockPrincipal,
    });

    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      organizationId: mockUser.organizationId,
      firstName: mockUser.firstName,
      organizationRole: mockUser.organizationRole,
      lastName: mockUser.lastName,
      trackEvents: mockUser.trackEvents,
      projectId: 'project-id-123',
      projectPermissions: {
        analytics: false,
      },
    });
  });

  it('should return null when user is not found', async () => {
    findOneByMock.mockResolvedValue(null);

    const result = await userService.getMetaInfo({
      principal: mockPrincipal,
    });

    expect(result).toBeNull();
    expect(getProjectPermissionsMock).not.toHaveBeenCalled();
  });

  it('should pass the correct principal projectId', async () => {
    const differentPrincipal: Principal = {
      ...mockPrincipal,
      projectId: 'different-project-id',
    };

    findOneByMock.mockResolvedValue(mockUser);
    getProjectPermissionsMock.mockResolvedValue({
      analytics: true,
    });

    const result = await userService.getMetaInfo({
      principal: differentPrincipal,
    });

    expect(result?.projectId).toBe('different-project-id');
  });
});
