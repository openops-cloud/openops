import {
  initializeLock,
  logger,
  sendLogs,
  setStopHandlers,
  system,
} from '@openops/server-shared';
import { FastifyInstance } from 'fastify';
import { appPostBoot } from './app/app';
import { databaseConnection } from './app/database/database-connection';
import { seedDevData } from './app/database/seeds/dev-seeds';
import { seedFocusDataAggregationTemplateTable } from './app/database/seeds/openops-aggregated-costs-seed';
import * as analytics from './app/database/seeds/openops-analytics-seed';
import { deleteOldOpportunitiesTable } from './app/database/seeds/openops-delete-old-opportunities-table';
import { seedOpportunitesTemplateTable } from './app/database/seeds/openops-opportunities-table-seed';
import { updateOpenopsTablesDatabase } from './app/database/seeds/openops-tables-rename-database';
import { upsertAdminUser } from './app/database/seeds/seed-admin';
import { seedEnvironmentId } from './app/database/seeds/seed-env-id';
import { seedTemplateTables } from './app/database/seeds/seed-template-tables';
import { setupServer } from './app/server';
import { telemetry } from './app/telemetry/telemetry';
import { workerPostBoot } from './app/worker';

const start = async (app: FastifyInstance): Promise<void> => {
  try {
    await app.listen({
      host: '0.0.0.0',
      port: 3000,
    });
    if (system.isWorker()) {
      await workerPostBoot();
    }
    if (system.isApp()) {
      await appPostBoot();
    }
  } catch (err) {
    logger.error('Error starting server', err);
    await sendLogs();
    process.exit(1);
  }
};

function setupTimeZone(): void {
  // It's important to set the time zone to UTC when working with dates in PostgreSQL.
  // If the time zone is not set to UTC, there can be problems when storing dates in UTC but not considering the UTC offset when converting them back to local time. This can lead to incorrect fields being displayed for the created
  // https://stackoverflow.com/questions/68240368/typeorm-find-methods-returns-wrong-timestamp-time
  process.env.TZ = 'UTC';
}

const main = async (): Promise<void> => {
  setupTimeZone();
  if (system.isApp()) {
    await databaseConnection().initialize();
    await databaseConnection().runMigrations();

    await upsertAdminUser();
    await updateOpenopsTablesDatabase();
    await deleteOldOpportunitiesTable();
    await seedDevData();

    await seedTemplateTables();
    await seedOpportunitesTemplateTable();
    await seedFocusDataAggregationTemplateTable();
    await analytics.seedAnalytics();

    initializeLock();
  }

  const environmentId = await seedEnvironmentId();

  const app = await setupServer();

  setStopHandlers(app, async () => {
    logger.info('Flushing telemetry...');
    await telemetry.flush();
  });

  await telemetry.start(() => Promise.resolve(environmentId));
  await start(app);
};

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.log(`Failed to start the server ${e}`, e);
  process.exit(1);
});
