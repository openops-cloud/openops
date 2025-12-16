import { ErrorCode, OrganizationRole, UserStatus } from '@openops/shared';
import { QueryFailedError } from 'typeorm';

const createUserServiceMock = jest.fn();
const deleteUserServiceMock = jest.fn();
jest.mock('../../../../src/app/user/user-service', () => ({
  userService: {
    create: createUserServiceMock,
    delete: deleteUserServiceMock,
  },
}));

const createTablesUserMock = jest.fn();
jest.mock('../../../../src/app/openops-tables', () => ({
  openopsTables: {
    createUser: createTablesUserMock,
  },
}));

const generateRandomPasswordMock = jest.fn();
jest.mock('@openops/server-shared', () => ({
  cryptoUtils: {
    generateRandomPassword: generateRandomPasswordMock,
  },
}));

import { createUser } from '../../../../src/app/authentication/new-user/create-user';

describe('create-user', () => {
  const baseParams = {
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    trackEvents: true,
    newsLetter: false,
    verified: true,
    organizationId: 'org-1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: 'email' as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates user and tables user successfully', async () => {
    const createdUser = {
      id: 'u1',
      email: baseParams.email,
      organizationId: baseParams.organizationId,
      firstName: baseParams.firstName,
      lastName: baseParams.lastName,
      status: UserStatus.ACTIVE,
      organizationRole: OrganizationRole.MEMBER,
      verified: baseParams.verified,
      trackEvents: baseParams.trackEvents,
      newsLetter: baseParams.newsLetter,
    };

    createUserServiceMock.mockResolvedValue(createdUser);
    createTablesUserMock.mockResolvedValue({
      refresh_token: 'tables-token',
    });

    const res = await createUser({ ...baseParams, password: 'P@ssw0rd' });

    expect(createUserServiceMock).toHaveBeenCalledWith({
      email: baseParams.email,
      organizationRole: OrganizationRole.MEMBER,
      verified: baseParams.verified,
      status: UserStatus.ACTIVE,
      firstName: baseParams.firstName,
      lastName: baseParams.lastName,
      trackEvents: baseParams.trackEvents,
      newsLetter: baseParams.newsLetter,
      password: 'P@ssw0rd',
      organizationId: baseParams.organizationId,
    });

    expect(createTablesUserMock).toHaveBeenCalledWith({
      name: 'John Doe',
      email: baseParams.email,
      password: res.user.password,
      authenticate: true,
    });

    expect(res).toEqual({
      user: createdUser,
      tablesRefreshToken: 'tables-token',
    });
  });

  it('maps duplicate user error to ApplicationError with EXISTING_USER', async () => {
    createUserServiceMock.mockRejectedValue(
      new QueryFailedError('insert into users', [], new Error('duplicate')),
    );

    await expect(
      createUser({ ...baseParams, password: 'P@ssw0rd' }),
    ).rejects.toMatchObject({
      error: {
        code: ErrorCode.EXISTING_USER,
        params: {
          email: baseParams.email,
          organizationId: baseParams.organizationId,
        },
      },
    });
  });

  it('rolls back created user if tables creation fails', async () => {
    const createdUser = {
      id: 'u2',
      organizationId: baseParams.organizationId,
    };
    createUserServiceMock.mockResolvedValue(createdUser);
    createTablesUserMock.mockRejectedValue(new Error('tables down'));

    await expect(
      createUser({ ...baseParams, password: 'P@ssw0rd' }),
    ).rejects.toBeInstanceOf(Error);

    expect(deleteUserServiceMock).toHaveBeenCalledWith({
      id: 'u2',
      organizationId: baseParams.organizationId,
    });
  });
});
