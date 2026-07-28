import { User } from '@openops/shared';

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: {
    getOneForUser: jest.fn(),
    getOne: jest.fn(),
  },
}));

import { oauthProjectMembershipService } from '../../../src/app/oauth/project-membership';
import { getOAuthProjectMembershipService } from '../../../src/app/oauth/project-membership-factory';
import { projectService } from '../../../src/app/project/project-service';

const USER = { id: 'user-1', organizationId: 'org-1' } as User;

describe('oauthProjectMembershipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultForUser', () => {
    it('returns the organization project a new connection binds to', async () => {
      (projectService.getOneForUser as jest.Mock).mockResolvedValue({
        id: 'project-1',
        organizationId: 'org-1',
      });

      expect(
        await oauthProjectMembershipService.getDefaultForUser(USER),
      ).toEqual({
        projectId: 'project-1',
        organizationId: 'org-1',
        projectRole: 'ADMIN',
      });
    });

    it('returns null when the user has no project', async () => {
      (projectService.getOneForUser as jest.Mock).mockResolvedValue(null);

      expect(
        await oauthProjectMembershipService.getDefaultForUser(USER),
      ).toBeNull();
    });
  });

  describe('getForUser', () => {
    it('authorizes a project in the user organization', async () => {
      (projectService.getOne as jest.Mock).mockResolvedValue({
        id: 'project-1',
        organizationId: 'org-1',
      });

      expect(
        await oauthProjectMembershipService.getForUser(USER, 'project-1'),
      ).toEqual({
        projectId: 'project-1',
        organizationId: 'org-1',
        projectRole: 'ADMIN',
      });
    });

    it('refuses a project in another organization', async () => {
      (projectService.getOne as jest.Mock).mockResolvedValue({
        id: 'project-9',
        organizationId: 'other-org',
      });

      expect(
        await oauthProjectMembershipService.getForUser(USER, 'project-9'),
      ).toBeNull();
    });

    it('refuses a project that does not exist', async () => {
      (projectService.getOne as jest.Mock).mockResolvedValue(null);

      expect(
        await oauthProjectMembershipService.getForUser(USER, 'missing'),
      ).toBeNull();
    });
  });
});

describe('getOAuthProjectMembershipService', () => {
  it('resolves to this edition implementation, and is the single seam an edition with real project membership replaces', () => {
    expect(getOAuthProjectMembershipService()).toBe(
      oauthProjectMembershipService,
    );
  });
});
