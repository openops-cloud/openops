import { TablesServerContext } from '@openops/common';
import { logger } from '@openops/server-shared';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';

export async function createBaseTemplateTables(
  tablesContext: TablesServerContext,
): Promise<void> {
  const buTable = await createBusinessUnitsTable(tablesContext);
  await createTagOwnerMappingTable(tablesContext, buTable.tableId);
  await createIdleEbsVolumesToDeleteTable(tablesContext);
  await createResourceBuTagAssignmentTable(tablesContext, buTable.tableId);

  logger.info('[Seeding template tables] Done');
}
