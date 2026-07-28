import { isNil } from '@openops/shared';
import { projectService } from '../project/project-service';
import { userService } from '../user/user-service';
import { getOAuthProjectMembershipService } from './project-membership-factory';

export type ConsentProject = {
  projectId: string;
  projectName: string;
};

/**
 * The project a new connection would be bound to, resolved for display only.
 *
 * The binding itself happens when the authorization code is redeemed, from the same
 * membership lookup. Naming the project on the consent screen is what lets the user see
 * whose data they are about to hand over.
 *
 * Absence is not an error here. Redemption performs the same lookup and refuses with a
 * precise reason, which serves the user better than a half-rendered consent screen.
 */
export async function describeTargetProject(
  userId: string,
): Promise<ConsentProject | null> {
  const user = await userService.get({ id: userId });

  if (isNil(user)) {
    return null;
  }

  const membership = await getOAuthProjectMembershipService().getDefaultForUser(
    user,
  );

  if (isNil(membership)) {
    return null;
  }

  const project = await projectService.getOne(membership.projectId);

  return {
    projectId: membership.projectId,
    // Falling back to the id keeps the screen honest if the project is unreadable:
    // it still names what is being granted rather than showing nothing.
    projectName: project?.displayName ?? membership.projectId,
  };
}
