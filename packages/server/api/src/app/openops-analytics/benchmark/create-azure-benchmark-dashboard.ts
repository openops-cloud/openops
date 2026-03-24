import {
  authenticateOpenOpsAnalyticsAdmin,
  enableDashboardEmbedding,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { assertNotNullOrUndefined } from '@openops/shared';
import { SEED_OPENOPS_TABLE_NAME as OPPORTUNITIES_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { TIMESERIES_TABLE_NAME } from '../../openops-tables/template-tables/create-timeseries-table';
import { organizationService } from '../../organization/organization.service';
import { upsertDashboard } from '../analytics-dashboard-registry-service';
import { getOrCreateOpenOpsTablesDatabaseConnection } from '../create-database-connection';
import { getDefaultProjectForOrganization } from '../project-selector';
import {
  createDashboardZipBuffer,
  importDashboardFromZip,
  resolveTableIds,
} from './benchmark-dashboard-helpers';
import { createAzureBenchmarkDatasets } from './create-azure-benchmark-datasets';

const USER_FRIENDLY_TABLE_SUFFIX = '_userfriendly';
const AZURE_BENCHMARK_DASHBOARD_SLUG = 'azure_benchmark';
const AZURE_BENCHMARK_DASHBOARD_DISPLAY_NAME = 'Azure Benchmark';

export async function createAzureBenchmarkDashboard(): Promise<void> {
  logger.info('Starting Azure Benchmark dashboard seeding');

  const { access_token } = await authenticateOpenOpsAnalyticsAdmin();

  const dbConnection = await getOrCreateOpenOpsTablesDatabaseConnection(
    access_token,
  );

  const organization = await organizationService.getOldestOrganization();
  assertNotNullOrUndefined(organization, 'Organization not found');

  const project = await getDefaultProjectForOrganization(organization.id);
  assertNotNullOrUndefined(project, 'Project not found');

  const tableIds = await resolveTableIds(project, [
    OPPORTUNITIES_TABLE_NAME,
    TIMESERIES_TABLE_NAME,
  ]);

  const opportunitiesTableName = `${OPPORTUNITIES_TABLE_NAME}_${tableIds[OPPORTUNITIES_TABLE_NAME]}${USER_FRIENDLY_TABLE_SUFFIX}`;
  const timeseriesTableName = `${TIMESERIES_TABLE_NAME}_${tableIds[TIMESERIES_TABLE_NAME]}${USER_FRIENDLY_TABLE_SUFFIX}`;

  const datasets = await createAzureBenchmarkDatasets(
    access_token,
    dbConnection.id,
    opportunitiesTableName,
    timeseriesTableName,
  );

  const dashboardZipBuffer = await createDashboardZipBuffer('azure');

  await importDashboardFromZip(
    access_token,
    dashboardZipBuffer,
    dbConnection.uuid,
    {
      Azure_Benchmark_Opportunities: datasets.opportunities.uuid,
      Azure_Benchmark_KPI_efficiency: datasets.kpi.uuid,
      Azure_Benchmark_Timeseries: datasets.timeseries.uuid,
    },
  );

  const embedResponse = await enableDashboardEmbedding(
    access_token,
    AZURE_BENCHMARK_DASHBOARD_SLUG,
  );

  await upsertDashboard(
    {
      id: AZURE_BENCHMARK_DASHBOARD_SLUG,
      name: AZURE_BENCHMARK_DASHBOARD_DISPLAY_NAME,
      slug: AZURE_BENCHMARK_DASHBOARD_SLUG,
      embedId: embedResponse.result.uuid,
      enabled: true,
    },
    access_token,
  );

  logger.info('Azure Benchmark dashboard seeding completed successfully');
}
