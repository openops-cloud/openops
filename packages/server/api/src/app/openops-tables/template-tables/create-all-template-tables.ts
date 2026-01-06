import { TablesServerContext } from '@openops/common';
import { logger } from '@openops/server-shared';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoInstancesShutdownTable } from './create-auto-instances-shutdown-table';
import { createBaseTemplateTables } from './create-base-template-tables';
import { createKnownCostTypesByApplicationTable } from './create-known-cost-types-by-application-table';
import { createOpportunitiesTable } from './create-opportunities-table';

async function additionalTemplateTables(
  tablesContext: TablesServerContext,
): Promise<void> {
  await createOpportunitiesTable(tablesContext);
  await createAggregatedCostsTable(tablesContext);
  await createKnownCostTypesByApplicationTable(tablesContext);
  await createAutoInstancesShutdownTable(tablesContext);
  logger.info('[Seeding additional template tables] Done');
}

export async function createAllTemplateTables(
  tablesContext: TablesServerContext,
): Promise<void> {
  await createBaseTemplateTables(tablesContext);
  await additionalTemplateTables(tablesContext);
}
