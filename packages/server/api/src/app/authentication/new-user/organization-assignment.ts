import { authenticateDefaultUserInOpenOpsTables } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { ApplicationError, ErrorCode, isNil, User } from '@openops/shared';
import { openopsTables } from '../../openops-tables';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';

export async function assignDefaultOrganization(user: User): Promise<void> {
  let organization = await organizationService.getOldestOrganization();

  const adminUser = await userService.getUserByEmailOrFail({
    email: system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL),
  });

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

  await userService.addUserToOrganization({
    id: user.id,
    organizationId: organization.id,
  });

  const updatedUser = await userService.getOneOrFail({ id: user.id });
  const project = await projectService.getOneForUser(updatedUser);

  if (!isNil(project)) {
    await addUserToDefaultWorkspace({
      email: user.email,
      workspaceId: project.tablesWorkspaceId,
    });
  } else {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: {
        message: 'No project found for user',
      },
    });
  }
}

async function addUserToDefaultWorkspace(values: {
  email: string;
  workspaceId: number;
}): Promise<void> {
  const { token: defaultToken } =
    await authenticateDefaultUserInOpenOpsTables();

  await openopsTables.addUserToWorkspace(defaultToken, {
    ...values,
  });
}
