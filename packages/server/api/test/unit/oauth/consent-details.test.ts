const userGetMock = jest.fn();
const projectGetOneMock = jest.fn();
const getDefaultForUserMock = jest.fn();

jest.mock('../../../src/app/user/user-service', () => ({
  userService: { get: userGetMock },
}));

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: { getOne: projectGetOneMock },
}));

jest.mock('../../../src/app/oauth/project-membership-factory', () => ({
  getOAuthProjectMembershipService: () => ({
    getDefaultForUser: getDefaultForUserMock,
  }),
}));

import { describeTargetProject } from '../../../src/app/oauth/consent-details';

const USER = { id: 'user-1', organizationId: 'org-1' };

describe('describeTargetProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userGetMock.mockResolvedValue(USER);
    getDefaultForUserMock.mockResolvedValue({
      projectId: 'proj-1',
      organizationId: 'org-1',
      projectRole: 'ADMIN',
    });
    projectGetOneMock.mockResolvedValue({
      id: 'proj-1',
      displayName: 'Cloud Ops',
    });
  });

  it('names the project the connection would be bound to', async () => {
    await expect(describeTargetProject('user-1')).resolves.toEqual({
      projectId: 'proj-1',
      projectName: 'Cloud Ops',
    });
  });

  it('resolves the project for the approving user, not an arbitrary one', async () => {
    await describeTargetProject('user-1');

    expect(userGetMock).toHaveBeenCalledWith({ id: 'user-1' });
    expect(getDefaultForUserMock).toHaveBeenCalledWith(USER);
  });

  it('returns nothing when the user cannot be found', async () => {
    userGetMock.mockResolvedValue(null);

    await expect(describeTargetProject('user-1')).resolves.toBeNull();
    expect(getDefaultForUserMock).not.toHaveBeenCalled();
  });

  it('returns nothing when the user has no accessible project', async () => {
    getDefaultForUserMock.mockResolvedValue(null);

    await expect(describeTargetProject('user-1')).resolves.toBeNull();
    expect(projectGetOneMock).not.toHaveBeenCalled();
  });

  it('falls back to the project id when the project is unreadable', async () => {
    projectGetOneMock.mockResolvedValue(null);

    // The screen must still name what is being granted rather than showing nothing.
    await expect(describeTargetProject('user-1')).resolves.toEqual({
      projectId: 'proj-1',
      projectName: 'proj-1',
    });
  });
});
