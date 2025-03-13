import {
  authenticateOpenOpsAnalyticsAdmin,
  getTableIdByTableName,
} from '@openops/common';
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { SEED_OPENOPS_TABLE_NAME } from '../openops-tables/template-tables/create-opportunities-table';
import { getOrCreatePostgresDatabaseConnection } from './create-database-connection';
import { getOrCreateDataset } from './create-dataset';
import { createOrGetDashboard } from './dashboard';
import { enableEmbeddedMode } from './enable-embedded-mode';
import { createHomepageCharts } from './populate-homepage';

export const HOME_PAGE_DASHBOARD_SLUG = 'homepage';

export async function seedAnalyticsDashboards(): Promise<void> {
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

  const finopsDashboard = await createOrGetDashboard(
    access_token,
    'FinOps',
    'finops',
  );
  await enableEmbeddedMode(access_token, finopsDashboard.id);

  const homepage = await createOrGetDashboard(
    access_token,
    'Homepage',
    'homepage',
  );

  let seedTableId: number | undefined;
  try {
    seedTableId = await getTableIdByTableName(SEED_OPENOPS_TABLE_NAME);
  } catch (error) {
    logger.error(`Could not find table with name: ${SEED_OPENOPS_TABLE_NAME}`, {
      tableName: SEED_OPENOPS_TABLE_NAME,
    });
    return;
  }

  const dataset = await getOrCreateDataset(
    access_token,
    `${SEED_OPENOPS_TABLE_NAME}_${seedTableId}_userfriendly`,
    dbConnection.id,
    'public',
  );
  await createHomepageCharts(
    access_token,
    dataset.id,
    homepage.id,
    seedTableId,
  );
}
