import {
  AppSystemProp,
  initializeLock,
  logger,
  QueueMode,
  sendLogs,
  setStopHandlers,
  system,
} from '@openops/server-shared';
import { isNil } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { appPostBoot } from './app/app';
import { databaseConnection } from './app/database/database-connection';
import { createOpenOpsTablesMcpEndpoint } from './app/database/seeds/create-open-ops-tables-mcp-endpoint';
import { seedDevData } from './app/database/seeds/dev-seeds';
import { seedFocusDataAggregationTemplateTable } from './app/database/seeds/openops-aggregated-costs-seed';
import * as analytics from './app/database/seeds/openops-analytics-seed';
import { deleteOldOpportunitiesTable } from './app/database/seeds/openops-delete-old-opportunities-table';
import { seedKnownCostTypesByApplicationTable } from './app/database/seeds/openops-knonw-cost-types-by-application-seed';
import { seedOpportunitesTemplateTable } from './app/database/seeds/openops-opportunities-table-seed';
import { updateOpenopsTablesDatabase } from './app/database/seeds/openops-tables-rename-database';
import { upsertAdminUser } from './app/database/seeds/seed-admin';
import { seedEnvironmentId } from './app/database/seeds/seed-env-id';
import { seedTemplateTables } from './app/database/seeds/seed-template-tables';
import { encryptUtils } from './app/helper/encryption';
import { jwtUtils } from './app/helper/jwt-utils';
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

async function validateEnvPropsOnStartup(): Promise<void> {
  const codeSandboxType = process.env.OPS_CODE_SANDBOX_TYPE;
  if (!isNil(codeSandboxType)) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_CODE_SANDBOX_TYPE is deprecated, please use OPS_EXECUTION_MODE instead',
      }),
    );
  }

  const queueMode = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE);
  const encryptionKey = await encryptUtils.loadEncryptionKey(queueMode);
  const isValidHexKey =
    encryptionKey && /^[A-Fa-z0-9]{32}$/.test(encryptionKey);
  if (!isValidHexKey) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_ENCRYPTION_KEY is either undefined or not a valid 32 hex string.',
      }),
    );
  }

  const jwtSecret = await jwtUtils.getJwtSecret();
  if (isNil(jwtSecret)) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_JWT_SECRET is undefined, please define it in the environment variables',
      }),
    );
  }
}

const main = async (): Promise<void> => {
  setupTimeZone();

  if (system.isApp()) {
    await validateEnvPropsOnStartup();

    await databaseConnection().initialize();
    await databaseConnection().runMigrations();

    await upsertAdminUser();
    await createOpenOpsTablesMcpEndpoint();
    await updateOpenopsTablesDatabase();
    await deleteOldOpportunitiesTable();
    await seedDevData();

    await seedTemplateTables();
    await seedOpportunitesTemplateTable();
    await seedFocusDataAggregationTemplateTable();
    await seedKnownCostTypesByApplicationTable();
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
