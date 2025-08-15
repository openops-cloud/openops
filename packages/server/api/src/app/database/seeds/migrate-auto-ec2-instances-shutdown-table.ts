import {
  addRow,
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
  getRows,
  getTableByName,
  makeOpenOpsTablesDelete,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME } from '../../openops-tables/template-tables/create-auto-instances-shutdown-table';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const AUTO_EC2_TO_AUTO_INSTANCES_MIGRATED_FLAG =
  'AUTOEC2_TO_INSTANCES_MIGRATED_V1';

type OldEc2Row = {
  Arn?: string;
  'Shutdown time'?: string | null;
  [key: string]: unknown;
};

async function isMigrationAlreadyDone(): Promise<boolean> {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const flag = await flagRepo.findOneBy({
    id: AUTO_EC2_TO_AUTO_INSTANCES_MIGRATED_FLAG,
  });
  return flag?.value === true;
}

async function setMigrationDone(): Promise<void> {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  await flagRepo.save({
    id: AUTO_EC2_TO_AUTO_INSTANCES_MIGRATED_FLAG,
    value: true,
  });
}

export async function migrateAutoEc2InstancesShutdownTable(): Promise<void> {
  try {
    if (await isMigrationAlreadyDone()) {
      logger.info(
        'Skip: Auto EC2 -> Auto instances shutdown migration already completed',
        {
          name: 'migrateAutoEc2InstancesShutdownTable',
        },
      );
      return;
    }

    const { token } = await authenticateDefaultUserInOpenOpsTables();

    const newTableExisting = await getTableByName(
      SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME,
    );
    if (!newTableExisting) {
      await seedTemplateTablesService.createAutoInstancesShutdownTable();
    }

    const oldTable = await getTableByName('Auto EC2 instances shutdown');
    const newTable = await getTableByName(
      SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME,
    );

    if (!newTable) {
      logger.error(
        'New table not found after creation attempt. Aborting migration.',
        {
          name: 'migrateAutoEc2InstancesShutdownTable',
        },
      );
      return;
    }

    if (!oldTable) {
      await setMigrationDone();
      logger.info('Skip: Old "Auto EC2 instances shutdown" table not found', {
        name: 'migrateAutoEc2InstancesShutdownTable',
      });
      return;
    }

    logger.info(
      'Starting migration of rows from old Auto EC2 table to new Auto instances table',
      {
        name: 'migrateAutoEc2InstancesShutdownTable',
      },
    );

    const rows = (await getRows({
      tableId: oldTable.id,
      token,
    })) as OldEc2Row[];

    for (const row of rows) {
      const arn = row.Arn ?? (row['Arn'] as string | undefined);
      const shutdownTime =
        (row['Shutdown time'] as string | null | undefined) ?? null;

      const fields: Record<string, unknown> = {
        'Resource ID': arn,
        'Shutdown time': shutdownTime,
        'Cloud provider': 'AWS',
        Workflow: '',
        Status: '',
      };

      await addRow({ tableId: newTable.id, token, fields });
    }

    await makeOpenOpsTablesDelete(
      `api/database/tables/${oldTable.id}/`,
      createAxiosHeaders(token),
    );

    await setMigrationDone();
    logger.info('Migration completed and old table deleted', {
      name: 'migrateAutoEc2InstancesShutdownTable',
    });
  } catch (error) {
    logger.error(
      'An error occurred during Auto EC2 -> Auto instances shutdown migration',
      {
        error,
        name: 'migrateAutoEc2InstancesShutdownTable',
      },
    );
  }
}
