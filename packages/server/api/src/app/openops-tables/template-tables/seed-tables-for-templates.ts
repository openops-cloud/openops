import { logger } from '@openops/server-shared';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';
import { TokenAndDatabaseId } from './types';

export const seedTemplateTablesService = {
  async createBaseTemplateTables({
    token,
    tablesDatabaseId,
  }: TokenAndDatabaseId) {
    const buTable = await createBusinessUnitsTable(tablesDatabaseId, token);
    await createTagOwnerMappingTable(tablesDatabaseId, token, buTable.tableId);
    await createIdleEbsVolumesToDeleteTable(tablesDatabaseId, token);
    await createResourceBuTagAssignmentTable(
      tablesDatabaseId,
      token,
      buTable.tableId,
    );

    logger.info('[Seeding template tables] Done');
  },
};
