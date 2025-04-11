import {
  authenticateDefaultUserInOpenOpsTables,
  getDefaultDatabaseId,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoEc2InstancesShutdownTable } from './create-auto-ec2-instances-shutdown-table';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createOpportunitiesTable } from './create-opportunities-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';

export const seedTemplateTablesService = {
  async createBaseTemplateTables() {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    const buTable = await createBusinessUnitsTable(databaseId, token);
    await createTagOwnerMappingTable(databaseId, token, buTable.tableId);
    await createIdleEbsVolumesToDeleteTable(databaseId, token);
    await createAutoEc2InstancesShutdownTable(databaseId, token);
    await createResourceBuTagAssignmentTable(
      databaseId,
      token,
      buTable.tableId,
    );

    logger.info('[Seeding template tables] Done');
  },

  async createOpportunityTemplateTable() {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createOpportunitiesTable(token, databaseId);

    logger.info('[Seeding opportunity template table] Done');
  },

  async createAggregatedCostsTable() {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createAggregatedCostsTable(databaseId, token);
  },
};
