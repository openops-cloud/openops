import { isNil } from '@openops/shared';
import { projectService } from '../project/project-service';
import { userService } from '../user/user-service';
import { getOAuthProjectMembershipService } from './project-membership-factory';

export type AvailableProject = {
  projectId: string;
  projectName: string;
};

/**
 * Every project the user may act in, for a client deciding where to switch to.
 *
 * Names are resolved here rather than by the membership service because the seam
 * answers questions about authority, not about display.
 */
export async function listAvailableProjects(
  userId: string,
): Promise<AvailableProject[]> {
  const user = await userService.get({ id: userId });

  if (isNil(user)) {
    return [];
  }

  const memberships = await getOAuthProjectMembershipService().listForUser(
    user,
  );
  const projects = await Promise.all(
    memberships.map((membership) =>
      projectService.getOne(membership.projectId),
    ),
  );

  return memberships.map((membership, index) => ({
    projectId: membership.projectId,
    projectName: projects[index]?.displayName ?? membership.projectId,
  }));
}
