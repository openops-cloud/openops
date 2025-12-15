import { AppSystemProp, system } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  isNil,
  User,
  UserWithOrganization,
} from '@openops/shared';
import { openopsTables } from '../../openops-tables';
import { authenticateAdminUserInOpenOpsTables } from '../../openops-tables/auth-admin-tables';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';

export async function assignDefaultOrganization(
  user: User,
): Promise<UserWithOrganization> {
  let organization = await organizationService.getOldestOrganization();

  const adminUser = await userService.getUserByEmailOrThrow(
    system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL),
  );

  organization = !isNil(adminUser.organizationId)
    ? await organizationService.getOne(adminUser.organizationId)
    : organization;

  if (!organization) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'Admin organization not found',
      },
    });
  }

  return userService.addUserToOrganization(user, organization.id);
}

export async function addUserToDefaultWorkspace(user: User): Promise<void> {
  const project = await projectService.getOneForUser(user);

  if (isNil(project)) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'No project found for user',
      },
    });
  }

  const { token: defaultToken } = await authenticateAdminUserInOpenOpsTables();

  await openopsTables.addUserToWorkspace(defaultToken, {
    email: user.email,
    workspaceId: project.tablesWorkspaceId,
  });
}
