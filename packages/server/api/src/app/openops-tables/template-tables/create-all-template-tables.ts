import { logger } from '@openops/server-shared';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoInstancesShutdownTable } from './create-auto-instances-shutdown-table';
import { createBaseTemplateTables } from './create-base-template-tables';
import { createKnownCostTypesByApplicationTable } from './create-known-cost-types-by-application-table';
import { createOpportunitiesTable } from './create-opportunities-table';
import { TablesContext } from './types';

async function additionalTemplateTables(
  tablesContext: TablesContext,
): Promise<void> {
  await createOpportunitiesTable(tablesContext);
  await createAggregatedCostsTable(tablesContext);
  await createKnownCostTypesByApplicationTable(tablesContext);
  await createAutoInstancesShutdownTable(tablesContext);
  logger.info('[Seeding additionaltemplate tables] Done');
}

export async function createAllTemplateTables(
  tablesContext: TablesContext,
): Promise<void> {
  await createBaseTemplateTables(tablesContext);
  await additionalTemplateTables(tablesContext);
}
