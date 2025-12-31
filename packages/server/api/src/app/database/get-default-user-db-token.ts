import { TablesServerContext } from '@openops/common';
import { AppSystemProp, system } from '@openops/server-shared';
import { projectService } from '../project/project-service';
import { userService } from '../user/user-service';

export const getDefaultProjectTablesDatabaseToken =
  async (): Promise<TablesServerContext> => {
    const defaultUserEmail = system.getOrThrow(
      AppSystemProp.OPENOPS_ADMIN_EMAIL,
    );

    const defaultUser = await userService.getUserByEmail(defaultUserEmail);
    if (!defaultUser) {
      throw new Error('Default user not found');
    }

    const project = await projectService.getAdminProject(
      defaultUser.id,
      defaultUser.organizationId!,
    );
    if (!project) {
      throw new Error('Project not found');
    }
    return {
      tablesDatabaseId: project.tablesDatabaseId,
      tablesDatabaseToken: project.tablesDatabaseToken,
    };
  };
