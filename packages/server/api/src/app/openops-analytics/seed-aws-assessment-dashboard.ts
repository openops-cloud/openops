import {
  authenticateOpenOpsAnalyticsAdmin,
  createAxiosHeadersForAnalytics,
  getTableIdByTableName,
  makeOpenOpsAnalyticsGet,
  makeOpenOpsAnalyticsPost,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { assertNotNullOrUndefined } from '@openops/shared';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { SEED_OPENOPS_TABLE_NAME as OPPORTUNITIES_TABLE_NAME } from '../openops-tables/template-tables/create-opportunities-table';
import { SEED_OPENOPS_TABLE_NAME as TIMESERIES_TABLE_NAME } from '../openops-tables/template-tables/create-timeseries-table';
import { organizationService } from '../organization/organization.service';
import { getOrCreatePostgresDatabaseConnection } from './create-database-connection';
import { getDefaultProjectForOrganization } from './project-selector';

const AWS_ASSESSMENT_DASHBOARD_SLUG = 'aws-assessment-playground';
const DASHBOARD_ZIP_PATH = path.join(
  process.cwd(),
  'packages',
  'server',
  'api',
  'assets',
  'dashboard_export_playground.zip',
);

type VirtualDatasetConfig = {
  table_name: string;
  sql: string;
  database: number;
  schema: string;
};

/**
 * Creates a SQL-based virtual dataset in Superset.
 * If a dataset with the same name already exists, it is deleted first
 * to ensure the SQL references the correct table names.
 */
async function createVirtualDataset(
  token: string,
  config: VirtualDatasetConfig,
): Promise<{ id: number; uuid: string }> {
  const authenticationHeader = createAxiosHeadersForAnalytics(token);

  // Check if dataset already exists and delete it to recreate with correct SQL
  const existingDataset = await getDatasetByName(token, config.table_name);
  if (existingDataset) {
    logger.info(
      `Dataset ${config.table_name} already exists, deleting to recreate with correct table references`,
      { datasetId: existingDataset.id },
    );
    await deleteDataset(token, existingDataset.id);
  }

  const requestBody = {
    database: config.database,
    schema: config.schema,
    sql: config.sql,
    table_name: config.table_name,
    is_managed_externally: false,
    external_url: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await makeOpenOpsAnalyticsPost<any>(
    'dataset',
    requestBody,
    authenticationHeader,
  );

  logger.info(`Created virtual dataset: ${config.table_name}`, {
    tableName: config.table_name,
    datasetId: response.id,
  });

  return { id: response.id, uuid: response.uuid };
}

/**
 * Gets a dataset by name
 */
async function getDatasetByName(
  token: string,
  name: string,
): Promise<{ id: number; uuid: string } | undefined> {
  const authenticationHeader = createAxiosHeadersForAnalytics(token);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await makeOpenOpsAnalyticsGet<{ result: any[] }>(
      `dataset?q=(filters:!((col:table_name,opr:eq,value:'${name}')))`,
      authenticationHeader,
      true,
    );

    return response && response?.result && response.result.length > 0
      ? { id: response.result[0].id, uuid: response.result[0].uuid }
      : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Deletes a dataset by ID
 */
async function deleteDataset(token: string, datasetId: number): Promise<void> {
  const baseUrl =
    system.get(AppSystemProp.ANALYTICS_PRIVATE_URL) + '/openops-analytics';

  try {
    await axios.delete(`${baseUrl}/api/v1/dataset/${datasetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    logger.info(`Deleted dataset with ID: ${datasetId}`);
  } catch (error) {
    logger.warn(`Failed to delete dataset ${datasetId}, continuing anyway`, {
      error,
    });
  }
}

/**
 * Imports a dashboard from a zip file using Superset's import API.
 * database_mapping maps the database name from the ZIP to the target database UUID.
 * dataset_mapping maps dataset names from the ZIP to their target dataset UUIDs,
 * so the import links charts to the pre-created datasets without overwriting them.
 */
async function importDashboardFromZip(
  token: string,
  zipPath: string,
  databaseUuid: string,
  datasetMapping: Record<string, string>,
): Promise<void> {
  const baseUrl =
    system.get(AppSystemProp.ANALYTICS_PRIVATE_URL) + '/openops-analytics';
  const importUrl = `${baseUrl}/api/v1/dashboard/import/`;

  const formData = new FormData();

  formData.append('formData', fs.createReadStream(zipPath));
  formData.append('passwords', JSON.stringify({}));
  formData.append('ssh_tunnel_passwords', JSON.stringify({}));
  formData.append('ssh_tunnel_private_keys', JSON.stringify({}));
  formData.append('ssh_tunnel_private_key_passwords', JSON.stringify({}));

  // Map database name from the ZIP to the actual database UUID
  const databaseMapping = {
    openops_tables_connection: databaseUuid,
  };
  formData.append('database_mapping', JSON.stringify(databaseMapping));

  // Map dataset names from the ZIP to their actual dataset UUIDs
  formData.append('dataset_mapping', JSON.stringify(datasetMapping));

  logger.info('Sending dashboard import request', {
    importUrl,
    databaseMapping,
    datasetMapping,
  });

  try {
    await axios.post(importUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    logger.info('Successfully imported AWS Assessment dashboard', {
      zipPath,
      slug: AWS_ASSESSMENT_DASHBOARD_SLUG,
    });
  } catch (error) {
    logger.error('Failed to import dashboard', {
      error,
      zipPath,
    });
    throw error;
  }
}

/**
 * Seeds the AWS Assessment dashboard with datasets and dashboard import
 */
export async function seedAwsAssessmentDashboard(): Promise<void> {
  logger.info('Starting AWS Assessment dashboard seeding');

  if (!fs.existsSync(DASHBOARD_ZIP_PATH)) {
    logger.warn(
      'Dashboard export zip file not found. Skipping AWS Assessment dashboard seeding.',
      { expectedPath: DASHBOARD_ZIP_PATH },
    );
    return;
  }

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

  let opportunitiesTableId: number;
  let timeseriesTableId: number;

  try {
    opportunitiesTableId = await getTableIdByTableName(
      OPPORTUNITIES_TABLE_NAME,
      {
        tablesDatabaseId: project.tablesDatabaseId,
        tablesDatabaseToken: project.tablesDatabaseToken,
      },
    );

    timeseriesTableId = await getTableIdByTableName(TIMESERIES_TABLE_NAME, {
      tablesDatabaseId: project.tablesDatabaseId,
      tablesDatabaseToken: project.tablesDatabaseToken,
    });
  } catch (error) {
    logger.error('Could not find required tables', {
      opportunitiesTable: OPPORTUNITIES_TABLE_NAME,
      timeseriesTable: TIMESERIES_TABLE_NAME,
      error,
    });
    return;
  }

  const opportunitiesTableName = `${OPPORTUNITIES_TABLE_NAME}_${opportunitiesTableId}_userfriendly`;
  const timeseriesTableName = `${TIMESERIES_TABLE_NAME}_${timeseriesTableId}_userfriendly`;

  logger.info('Found required tables', {
    opportunitiesTableId,
    opportunitiesTableName,
    timeseriesTableId,
    timeseriesTableName,
  });

  // Create datasets with correct table references before importing the dashboard
  const opportunitiesDataset = await createVirtualDataset(access_token, {
    table_name: 'AWS_Assessment_Opportunities',
    sql: `SELECT *
FROM public."${opportunitiesTableName}"
WHERE "Workflow" LIKE 'Assessment%'
`,
    database: dbConnection.id,
    schema: 'public',
  });

  const kpiDataset = await createVirtualDataset(access_token, {
    table_name: 'AWS_Assessment_KPI_efficiency',
    sql: `WITH opp AS (
  SELECT
    "Account" AS opp_account,
    COALESCE(SUM("Estimated savings USD per month"), 0) AS opp_sum
  FROM public."${opportunitiesTableName}"
  WHERE "Workflow" LIKE 'Assessment%'
  GROUP BY "Account"
),
ts AS (
  SELECT
    "Account" AS ts_account,
    COALESCE(SUM("Value"), 0) AS ts_value
  FROM public."${timeseriesTableName}"
  WHERE "Workflow" = 'Run AWS Assessment'
    AND "Date" = (date_trunc('month', current_date) - interval '1 month')::date
  GROUP BY "Account"
)
SELECT
  COALESCE(opp.opp_account, ts.ts_account) AS "Account",
  COALESCE(opp.opp_sum, 0) AS savings,
  COALESCE(ts.ts_value, 0) AS monthly_cost,
  (1 - (COALESCE(opp.opp_sum, 0) / NULLIF(COALESCE(ts.ts_value, 0), 0))) * 100.0 AS kpi
FROM opp
FULL OUTER JOIN ts
  ON opp.opp_account = ts.ts_account;
`,
    database: dbConnection.id,
    schema: 'public',
  });

  await importDashboardFromZip(
    access_token,
    DASHBOARD_ZIP_PATH,
    dbConnection.uuid,
    {
      AWS_Assessment_Opportunities: opportunitiesDataset.uuid,
      AWS_Assessment_KPI_efficiency: kpiDataset.uuid,
    },
  );

  logger.info('AWS Assessment dashboard seeding completed successfully');
}
