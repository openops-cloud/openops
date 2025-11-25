import { getDefaultDatabaseId } from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoInstancesShutdownTable } from './create-auto-instances-shutdown-table';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createKnownCostTypesByApplicationTable } from './create-known-cost-types-by-application-table';
import { createOpportunitiesTable } from './create-opportunities-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';

export const seedTemplateTablesService = {
  async createBaseTemplateTables() {
    const { token } =
      await openopsTables.authenticateAdminUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    const buTable = await createBusinessUnitsTable(databaseId, token);
    await createTagOwnerMappingTable(databaseId, token, buTable.tableId);
    await createIdleEbsVolumesToDeleteTable(databaseId, token);
    await createResourceBuTagAssignmentTable(
      databaseId,
      token,
      buTable.tableId,
    );

    logger.info('[Seeding template tables] Done');
  },

  async createOpportunityTemplateTable() {
    const { token } =
      await openopsTables.authenticateAdminUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createOpportunitiesTable(token, databaseId);

    logger.info('[Seeding opportunity template table] Done');
  },

  async createAggregatedCostsTable() {
    const { token } =
      await openopsTables.authenticateAdminUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createAggregatedCostsTable(databaseId, token);
  },

  async createKnownCostTypesByApplicationTable() {
    const { token } =
      await openopsTables.authenticateAdminUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createKnownCostTypesByApplicationTable(token, databaseId);

    logger.info('[Seeding Known cost types by application table] Done');
  },

  async createAutoInstancesShutdownTable(): Promise<void> {
    const { token } =
      await openopsTables.authenticateAdminUserInOpenOpsTables();
    const databaseId = await getDefaultDatabaseId(token);

    await createAutoInstancesShutdownTable(token, databaseId);

    logger.info('[Seeding Auto Instances Shutdown table] Done');
  },
};
