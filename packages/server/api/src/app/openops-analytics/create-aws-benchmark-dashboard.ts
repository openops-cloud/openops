import { authenticateOpenOpsAnalyticsAdmin } from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { assertNotNullOrUndefined } from '@openops/shared';
import { SEED_OPENOPS_TABLE_NAME as OPPORTUNITIES_TABLE_NAME } from '../openops-tables/template-tables/create-opportunities-table';
import { TIMESERIES_TABLE_NAME } from '../openops-tables/template-tables/create-timeseries-table';
import { organizationService } from '../organization/organization.service';
import {
  createDashboardZipBuffer,
  importDashboardFromZip,
  resolveTableIds,
} from './benchmark-dashboard-helpers';
import { getOrCreatePostgresDatabaseConnection } from './create-database-connection';
import { getDefaultProjectForOrganization } from './project-selector';
import { createVirtualDataset } from './virtual-dataset';

async function createAwsBenchmarkDatasets(
  token: string,
  databaseId: number,
  opportunitiesTableName: string,
  timeseriesTableName: string,
) {
  const opportunities = await createVirtualDataset(token, {
    tableName: 'AWS_Benchmark_Opportunities',
    sql: `SELECT *
FROM public."${opportunitiesTableName}"
WHERE "Workflow" LIKE 'AWS Benchmark%'
`,
    databaseId,
    schema: 'public',
    recreateIfExists: true,
  });

  const kpi = await createVirtualDataset(token, {
    tableName: 'AWS_Benchmark_KPI_efficiency',
    sql: `WITH opp AS (
  SELECT
    "Account" AS opp_account,
    COALESCE(SUM("Estimated savings USD per month"), 0) AS opp_sum
  FROM public."${opportunitiesTableName}"
  WHERE "Workflow" LIKE 'AWS Benchmark%'
  GROUP BY "Account"
),
ts AS (
  SELECT
    "Account" AS ts_account,
    COALESCE(SUM("Value"), 0) AS ts_value
  FROM public."${timeseriesTableName}"
  WHERE "Workflow" = 'Run AWS Benchmark'
    AND "Date" = (date_trunc('month', current_date) - interval '1 month')::date
  GROUP BY "Account"
)
SELECT
  COALESCE(opp.opp_account, ts.ts_account) AS "Account",
  COALESCE(opp.opp_sum, 0) AS savings,
  COALESCE(ts.ts_value, 0) AS monthly_cost,
  CASE
    WHEN COALESCE(ts.ts_value, 0) = 0 THEN 100.0
    ELSE (1 - (COALESCE(opp.opp_sum, 0) / COALESCE(ts.ts_value, 0))) * 100.0
  END AS kpi
FROM opp
FULL OUTER JOIN ts
  ON opp.opp_account = ts.ts_account;
`,
    databaseId,
    schema: 'public',
    recreateIfExists: true,
  });

  return { opportunities, kpi };
}

const USERFRIENDLYTABLE_SUFFIX = '_userfriendly';

export async function createAwsBenchmarkDashboard(): Promise<void> {
  logger.info('Starting AWS Benchmark dashboard seeding');

  const { access_token } = await authenticateOpenOpsAnalyticsAdmin();

  const dbConnection = await getOrCreatePostgresDatabaseConnection(
    access_token,
    system.getOrThrow(AppSystemProp.OPENOPS_TABLES_DATABASE_NAME),
    system.getOrThrow(AppSystemProp.POSTGRES_PASSWORD),
    system.getOrThrow(AppSystemProp.POSTGRES_PORT),
    system.getOrThrow(AppSystemProp.POSTGRES_USERNAME),
    system.get(AppSystemProp.OPENOPS_TABLES_DB_HOST) ??
      system.getOrThrow(AppSystemProp.POSTGRES_HOST),
    'openops_tables_connection',
  );

  const organization = await organizationService.getOldestOrganization();
  assertNotNullOrUndefined(organization, 'Organization not found');

  const project = await getDefaultProjectForOrganization(organization.id);
  assertNotNullOrUndefined(project, 'Project not found');

  const tableIds = await resolveTableIds(project, [
    OPPORTUNITIES_TABLE_NAME,
    TIMESERIES_TABLE_NAME,
  ]);
  if (!tableIds) {
    throw new Error(
      'Could not resolve required table IDs for benchmark dashboard',
    );
  }
  const opportunitiesTableName = `${OPPORTUNITIES_TABLE_NAME}_${tableIds[OPPORTUNITIES_TABLE_NAME]}${USERFRIENDLYTABLE_SUFFIX}`;
  const timeseriesTableName = `${TIMESERIES_TABLE_NAME}_${tableIds[TIMESERIES_TABLE_NAME]}${USERFRIENDLYTABLE_SUFFIX}`;

  const datasets = await createAwsBenchmarkDatasets(
    access_token,
    dbConnection.id,
    opportunitiesTableName,
    timeseriesTableName,
  );

  const dashboardZipBuffer = await createDashboardZipBuffer('aws');

  await importDashboardFromZip(
    access_token,
    dashboardZipBuffer,
    dbConnection.uuid,
    {
      AWS_Benchmark_Opportunities: datasets.opportunities.uuid,
      AWS_Benchmark_KPI_efficiency: datasets.kpi.uuid,
    },
  );

  logger.info('AWS Benchmark dashboard seeding completed successfully');
}
