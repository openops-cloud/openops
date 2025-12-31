import { logger } from '@openops/server-shared';
import { createBusinessUnitsTable } from './create-business-units-table';
import { createIdleEbsVolumesToDeleteTable } from './create-idle-ebs-volumes-to-delete-table';
import { createResourceBuTagAssignmentTable } from './create-resource-bu-tag-assignment-table';
import { createTagOwnerMappingTable } from './create-tag-owner-mapping-table';
import { TablesContext } from './types';

export async function createBaseTemplateTables({
  bearerToken,
  tablesDatabaseId,
}: TablesContext): Promise<void> {
  const buTable = await createBusinessUnitsTable(tablesDatabaseId, bearerToken);
  await createTagOwnerMappingTable(
    tablesDatabaseId,
    bearerToken,
    buTable.tableId,
  );
  await createIdleEbsVolumesToDeleteTable(tablesDatabaseId, bearerToken);
  await createResourceBuTagAssignmentTable(
    tablesDatabaseId,
    bearerToken,
    buTable.tableId,
  );

  logger.info('[Seeding template tables] Done');
}
