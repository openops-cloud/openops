import {
  encryptionKeyInitializer,
  initializeLock,
  logger,
  sendLogs,
  setStopHandlers,
  system,
} from '@openops/server-shared';
import { isNil } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { appPostBoot } from './app/app';
import { databaseConnection } from './app/database/database-connection';
import { seedAutoInstancesShutdownTable } from './app/database/seeds/auto-instances-shutdown-table-seed';
import { seedDevData } from './app/database/seeds/dev-seeds';
import { ensureTablesMcpEndpointExists } from './app/database/seeds/ensure-tables-mcp-endpoint-exists';
import { seedFocusDataAggregationTemplateTable } from './app/database/seeds/openops-aggregated-costs-seed';
import * as analytics from './app/database/seeds/openops-analytics-seed';
import { seedKnownCostTypesByApplicationTable } from './app/database/seeds/openops-known-cost-types-by-application-seed';
import { seedOpportunitesTemplateTable } from './app/database/seeds/openops-opportunities-table-seed';
import { seedTimeseriesTemplateTable } from './app/database/seeds/openops-timeseries-table-seed';
import { upsertAdminUser } from './app/database/seeds/seed-admin';
import { seedEnvironmentId } from './app/database/seeds/seed-env-id';
import { seedTemplateTables } from './app/database/seeds/seed-template-tables';
import { jwtUtils } from './app/helper/jwt-utils';
import { systemJobsSchedule } from './app/helper/system-jobs';
import { registerTemplateTablesCreationJobHandler } from './app/openops-tables/template-tables/template-tables-job';
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
  } catch (error) {
    logger.error('Error starting server', { error });
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

  void encryptionKeyInitializer();

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

    initializeLock();
    await systemJobsSchedule.init();
    registerTemplateTablesCreationJobHandler();

    await databaseConnection().initialize();
    await databaseConnection().runMigrations();

    await upsertAdminUser();
    await ensureTablesMcpEndpointExists();
    await seedDevData();

    await seedTemplateTables();
    await seedOpportunitesTemplateTable();
    await seedTimeseriesTemplateTable();
    await seedFocusDataAggregationTemplateTable();
    await seedKnownCostTypesByApplicationTable();
    await seedAutoInstancesShutdownTable();

    if (system.isAnalyticsEnabled()) {
      await analytics.seedAnalytics();
    } else {
      logger.info('Skipping analytics seed run, analytics disabled');
    }
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
