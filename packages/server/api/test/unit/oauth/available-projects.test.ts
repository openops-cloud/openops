const userGetMock = jest.fn();
const projectGetOneMock = jest.fn();
const listForUserMock = jest.fn();

jest.mock('../../../src/app/user/user-service', () => ({
  userService: { get: userGetMock },
}));

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: { getOne: projectGetOneMock },
}));

jest.mock('../../../src/app/oauth/project-membership-factory', () => ({
  getOAuthProjectMembershipService: () => ({
    listForUser: listForUserMock,
  }),
}));

import { listAvailableProjects } from '../../../src/app/oauth/available-projects';

const USER = { id: 'user-1', organizationId: 'org-1' };

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
