import { TablesServerContext } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { Project } from '@openops/shared';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';

const getAdminUserProject = async (): Promise<Project> => {
  const email = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);
  const user = await userService.getByOrganizationAndEmail({
    organizationId: null,
    email,
  });

  if (!user) {
    throw new Error(`Admin user not found for email: ${email}`);
  }

  const project = await projectService.getOneForUser(user);

  if (!project) {
    throw new Error(`No project found for user: ${email}`);
  }

  return project;
};

export const getAdminTablesContext = async (): Promise<TablesServerContext> => {
  const { tablesDatabaseId, tablesDatabaseToken } = await getAdminUserProject();

  return { tablesDatabaseToken, tablesDatabaseId };
};
