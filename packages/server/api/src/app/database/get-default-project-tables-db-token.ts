import { TablesServerContext } from '@openops/common';
import { assertNotNullOrUndefined } from '@openops/shared';
import { organizationService } from '../organization/organization.service';
import { getProjectSelectorService } from '../project/project-selector-service-factory';

export const getDefaultProjectTablesServerContext =
  async (): Promise<TablesServerContext> => {
    const organization = await organizationService.getOldestOrganization();
    assertNotNullOrUndefined(organization, 'organization');

    const project =
      await getProjectSelectorService().getDefaultProjectForOrganization(
        organization.id,
      );

    assertNotNullOrUndefined(project, 'project');

    return {
      tablesDatabaseId: project.tablesDatabaseId,
      tablesDatabaseToken: project.tablesDatabaseToken,
    };
  };
