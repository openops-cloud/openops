import {
  authenticateOpenOpsAnalyticsAdmin,
  enableDashboardEmbedding,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { assertNotNullOrUndefined } from '@openops/shared';
import { SEED_OPENOPS_TABLE_NAME as OPPORTUNITIES_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { TIMESERIES_TABLE_NAME } from '../../openops-tables/template-tables/create-timeseries-table';
import { organizationService } from '../../organization/organization.service';
import { getOrCreateOpenOpsTablesDatabaseConnection } from '../create-database-connection';
import { getDefaultProjectForOrganization } from '../project-selector';
import {
  createDashboardZipBuffer,
  importDashboardFromZip,
  resolveTableIds,
} from './benchmark-dashboard-helpers';
import { createAwsBenchmarkDatasets } from './create-aws-benchmark-datasets';

const USER_FRIENDLY_TABLE_SUFFIX = '_userfriendly';
const AWS_BENCHMARK_DASHBOARD_SLUG = 'aws_benchmark';

export async function createAwsBenchmarkDashboard(): Promise<void> {
  logger.info('Starting AWS Benchmark dashboard seeding');

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

  await enableDashboardEmbedding(access_token, AWS_BENCHMARK_DASHBOARD_SLUG);

  logger.info('AWS Benchmark dashboard seeding completed successfully');
}
