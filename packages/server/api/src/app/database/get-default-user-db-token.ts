import { TablesServerContext } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { userService } from '../user/user-service';
import { getAdminProject } from './seeds/get-admin-project';

// TODO: Change the place where this method is used to not rely on the admin user
export const getDefaultProjectTablesDatabaseToken =
  async (): Promise<TablesServerContext> => {
    const defaultUserEmail = system.getOrThrow(
      AppSystemProp.OPENOPS_ADMIN_EMAIL,
    );

    const defaultUser = await userService.getUserByEmail(defaultUserEmail);
    if (!defaultUser) {
      throw new Error('Default user not found');
    }

    const project = await getAdminProject(defaultUser);
    if (!project) {
      throw new Error('Project not found');
    }
    return {
      tablesDatabaseId: project.tablesDatabaseId,
      tablesDatabaseToken: project.tablesDatabaseToken,
    };
  };
