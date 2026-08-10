const userGetMock = jest.fn();
const projectGetManyByIdsMock = jest.fn();
const listForUserMock = jest.fn();

jest.mock('../../../../src/app/user/user-service', () => ({
  userService: { get: userGetMock },
}));

jest.mock('../../../../src/app/project/project-service', () => ({
  projectService: { getManyByIds: projectGetManyByIdsMock },
}));

jest.mock(
  '../../../../src/app/oauth/projects/project-membership-factory',
  () => ({
    getOAuthProjectMembershipService: () => ({
      listForUser: listForUserMock,
    }),
  }),
);

import { listAvailableProjects } from '../../../../src/app/oauth/projects/available-projects';

const USER = { id: 'user-1', organizationId: 'org-1' };

describe('listAvailableProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userGetMock.mockResolvedValue(USER);
    listForUserMock.mockResolvedValue([
      { projectId: 'proj-1', organizationId: 'org-1', projectRole: 'ADMIN' },
      { projectId: 'proj-2', organizationId: 'org-1', projectRole: 'ADMIN' },
    ]);
    projectGetManyByIdsMock.mockResolvedValue([
      { id: 'proj-1', displayName: 'Cloud Ops' },
      { id: 'proj-2', displayName: 'Data' },
    ]);
  });

  it('names every project the connection may switch to', async () => {
    await expect(listAvailableProjects('user-1')).resolves.toEqual([
      { projectId: 'proj-1', projectName: 'Cloud Ops' },
      { projectId: 'proj-2', projectName: 'Data' },
    ]);
  });

  it('asks the membership service, not the project table, what is reachable', async () => {
    await listAvailableProjects('user-1');

    // Membership is the authority: any other source would let a client see, and try to
    // switch into, projects it has no claim on.
    expect(listForUserMock).toHaveBeenCalledWith(USER);
  });

  it('returns nothing when the user cannot be found', async () => {
    userGetMock.mockResolvedValue(null);

    await expect(listAvailableProjects('user-1')).resolves.toEqual([]);
    expect(listForUserMock).not.toHaveBeenCalled();
  });

  it('keeps a project whose name cannot be read', async () => {
    projectGetManyByIdsMock.mockResolvedValue([]);

    // Still switchable — an unreadable display name is not a reason to hide it.
    await expect(listAvailableProjects('user-1')).resolves.toEqual([
      { projectId: 'proj-1', projectName: 'proj-1' },
      { projectId: 'proj-2', projectName: 'proj-2' },
    ]);
  });

  it('reads every project in one query', async () => {
    await listAvailableProjects('user-1');

    // An agent polls this endpoint, so a query per membership would scale with the number
    // of projects in the organization.
    expect(projectGetManyByIdsMock).toHaveBeenCalledTimes(1);
    expect(projectGetManyByIdsMock).toHaveBeenCalledWith(['proj-1', 'proj-2']);
  });

  it('reports names in membership order, whatever order the rows come back in', async () => {
    projectGetManyByIdsMock.mockResolvedValue([
      { id: 'proj-2', displayName: 'Data' },
      { id: 'proj-1', displayName: 'Cloud Ops' },
    ]);

    await expect(listAvailableProjects('user-1')).resolves.toEqual([
      { projectId: 'proj-1', projectName: 'Cloud Ops' },
      { projectId: 'proj-2', projectName: 'Data' },
    ]);
  });
});
