import { isNil, User } from '@openops/shared';
import { projectService } from '../../project/project-service';

export type OAuthProjectMembership = {
  projectId: string;
  organizationId: string;
  projectRole: string;
};

export type OAuthProjectMembershipService = {
  getDefaultForUser(user: User): Promise<OAuthProjectMembership | null>;
  /** Re-checked on every OAuth request, so losing access takes effect before expiry. */
  getForUser(
    user: User,
    projectId: string,
  ): Promise<OAuthProjectMembership | null>;
};

// One project per organization and no role model
const PROJECT_ROLE = 'ADMIN';

export const oauthProjectMembershipService: OAuthProjectMembershipService = {
  async getDefaultForUser(user: User): Promise<OAuthProjectMembership | null> {
    const project = await projectService.getOneForUser(user);

    if (isNil(project)) {
      return null;
    }

    return {
      projectId: project.id,
      organizationId: project.organizationId,
      projectRole: PROJECT_ROLE,
    };
  },

  async getForUser(
    user: User,
    projectId: string,
  ): Promise<OAuthProjectMembership | null> {
    const project = await projectService.getOne(projectId);

    if (isNil(project) || project.organizationId !== user.organizationId) {
      return null;
    }

    return {
      projectId: project.id,
      organizationId: project.organizationId,
      projectRole: PROJECT_ROLE,
    };
  },
};
