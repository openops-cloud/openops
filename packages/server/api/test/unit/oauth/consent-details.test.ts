const userGetMock = jest.fn();
const projectGetOneMock = jest.fn();
const getDefaultForUserMock = jest.fn();
const listForUserMock = jest.fn();

jest.mock('../../../src/app/user/user-service', () => ({
  userService: { get: userGetMock },
}));

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: { getOne: projectGetOneMock },
}));

jest.mock('../../../src/app/oauth/project-membership-factory', () => ({
  getOAuthProjectMembershipService: () => ({
    getDefaultForUser: getDefaultForUserMock,
    listForUser: listForUserMock,
  }),
}));

import {
  describeTargetProject,
  listAvailableProjects,
} from '../../../src/app/oauth/consent-details';

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

describe('listAvailableProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userGetMock.mockResolvedValue(USER);
    listForUserMock.mockResolvedValue([
      { projectId: 'proj-1', organizationId: 'org-1', projectRole: 'ADMIN' },
      { projectId: 'proj-2', organizationId: 'org-1', projectRole: 'ADMIN' },
    ]);
    projectGetOneMock.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        displayName: id === 'proj-1' ? 'Cloud Ops' : 'Data',
      }),
    );
  });

  it('names every project the connection may switch to', async () => {
    await expect(listAvailableProjects('user-1')).resolves.toEqual([
      { projectId: 'proj-1', projectName: 'Cloud Ops' },
      { projectId: 'proj-2', projectName: 'Data' },
    ]);
  });

  it('asks the membership service, not the project table, what is reachable', async () => {
    await listAvailableProjects('user-1');

    // Membership is the authority. Listing projects some other way would let a client
    // see, and try to switch into, projects it has no claim on.
    expect(listForUserMock).toHaveBeenCalledWith(USER);
  });

  it('returns nothing when the user cannot be found', async () => {
    userGetMock.mockResolvedValue(null);

    await expect(listAvailableProjects('user-1')).resolves.toEqual([]);
    expect(listForUserMock).not.toHaveBeenCalled();
  });

  it('keeps a project whose name cannot be read', async () => {
    projectGetOneMock.mockResolvedValue(null);

    // Still switchable — an unreadable display name is not a reason to hide it.
    await expect(listAvailableProjects('user-1')).resolves.toEqual([
      { projectId: 'proj-1', projectName: 'proj-1' },
      { projectId: 'proj-2', projectName: 'proj-2' },
    ]);
  });
});
