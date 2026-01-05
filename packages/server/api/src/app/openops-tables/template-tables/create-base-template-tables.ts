import { TablesServerContext } from '@openops/common';
import { logger } from '@openops/server-shared';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';

export async function createBaseTemplateTables(
  context: TablesServerContext,
): Promise<void> {
  const buTable = await createBusinessUnitsTable(context);
  await createTagOwnerMappingTable(context, buTable.tableId);
  await createIdleEbsVolumesToDeleteTable(context);
  await createResourceBuTagAssignmentTable(context, buTable.tableId);

  logger.info('[Seeding template tables] Done');
}
