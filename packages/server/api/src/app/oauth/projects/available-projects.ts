import { isNil } from '@openops/shared';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';
import { getOAuthProjectMembershipService } from './project-membership-factory';

export type AvailableProject = {
  projectId: string;
  projectName: string;
};

// Names are resolved here rather than by the membership service, which answers questions
// about authority, not display.
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

  // One query rather than one per membership: agents poll this to decide where to switch.
  const projects = await projectService.getManyByIds(
    memberships.map((membership) => membership.projectId),
  );
  const displayNames = new Map(
    projects.map((project) => [project.id, project.displayName]),
  );

  return memberships.map((membership) => ({
    projectId: membership.projectId,
    projectName: displayNames.get(membership.projectId) ?? membership.projectId,
  }));
}
