import { TablesServerContext } from '@openops/common';
import { logger } from '@openops/server-shared';
import { createAggregatedCostsTable } from './create-aggregated-costs-table';
import { createAutoInstancesShutdownTable } from './create-auto-instances-shutdown-table';
import { createBaseTemplateTables } from './create-base-template-tables';
import { createKnownCostTypesByApplicationTable } from './create-known-cost-types-by-application-table';
import { createOpportunitiesTable } from './create-opportunities-table';

async function additionalTemplateTables(
  context: TablesServerContext,
): Promise<void> {
  await createOpportunitiesTable(context);
  await createAggregatedCostsTable(context);
  await createKnownCostTypesByApplicationTable(context);
  await createAutoInstancesShutdownTable(context);
  logger.info('[Seeding additional template tables] Done');
}

export async function createAllTemplateTables(
  context: TablesServerContext,
): Promise<void> {
  await createBaseTemplateTables(context);
  await additionalTemplateTables(context);
}
