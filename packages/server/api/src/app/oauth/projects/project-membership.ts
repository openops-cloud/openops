import { isNil, User } from '@openops/shared';
import { projectService } from '../../project/project-service';

// `projectRole` is a plain string because the role model is an enterprise concern; this
// edition reports the same value the session login path does.
export type OAuthProjectMembership = {
  projectId: string;
  organizationId: string;
  projectRole: string;
};

/**
 * Behind a factory (`project-membership-factory.ts`) so an edition with real
 * multi-project membership can answer these without the OAuth code changing.
 */
export type OAuthProjectMembershipService = {
  getDefaultForUser(user: User): Promise<OAuthProjectMembership | null>;
  /** Re-checked on every OAuth request, so losing access takes effect before expiry. */
  getForUser(
    user: User,
    projectId: string,
  ): Promise<OAuthProjectMembership | null>;
  /** Every project the connection may switch to. */
  listForUser(user: User): Promise<OAuthProjectMembership[]>;
};

// One project per organization and no role model in this edition.
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

  async listForUser(user: User): Promise<OAuthProjectMembership[]> {
    // Same rule as `getForUser`: listing less than that allows would tell a client it
    // may act in one place while the token endpoint switched it to another.
    if (isNil(user.organizationId)) {
      return [];
    }

    const projectIds = await projectService.getProjectIdsByOrganizationId(
      user.organizationId,
    );

    return projectIds.map((projectId) => ({
      projectId,
      organizationId: user.organizationId as string,
      projectRole: PROJECT_ROLE,
    }));
  },
};
