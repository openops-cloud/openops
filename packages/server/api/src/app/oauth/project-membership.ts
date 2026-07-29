import { isNil, User } from '@openops/shared';
import { projectService } from '../project/project-service';

/**
 * What an OAuth connection is allowed to act as, for one project.
 *
 * `projectRole` is a plain string rather than an enum because the role model is
 * an enterprise concern: this edition has no per-project roles and reports the
 * same value the session login path does.
 */
export type OAuthProjectMembership = {
  projectId: string;
  organizationId: string;
  projectRole: string;
};

/**
 * The three questions the OAuth server asks about projects. Kept behind a factory
 * (`project-membership-factory.ts`) so an edition with real multi-project
 * membership can answer them without the OAuth code changing.
 */
export type OAuthProjectMembershipService = {
  /** Where a newly authorized connection starts. */
  getDefaultForUser(user: User): Promise<OAuthProjectMembership | null>;
  /**
   * Whether this user may act in this project, and as what. Called on every
   * request that presents an OAuth token, so losing access takes effect without
   * waiting for the token to expire.
   */
  getForUser(
    user: User,
    projectId: string,
  ): Promise<OAuthProjectMembership | null>;
  /**
   * Every project the connection may act in — what a client lists to decide where
   * to switch to. Membership is the authority, so this is the same set the user
   * could reach in the browser.
   */
  listForUser(user: User): Promise<OAuthProjectMembership[]>;
};

// This edition has one project per organization and no role model, so both
// questions reduce to "is this the organization's project".
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
    // Deliberately the same rule as `getForUser` — every project in the user's
    // organization — rather than "the one project this edition expects". If this
    // listed less than `getForUser` allows, a client could be told it may only act in
    // one place while the token endpoint happily switched it to another it was never
    // shown. In practice this edition has one project per organization and the list
    // has a single entry.
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
