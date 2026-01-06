import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import {
  createAutoInstancesShutdownTable,
  SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME,
} from '../../openops-tables/template-tables/create-auto-instances-shutdown-table';
import { databaseConnection } from '../database-connection';
import { getAdminTablesContext } from './get-admin-token-and-database';

const AUTO_INSTANCES_SHUTDOWN_TABLE_SEED = 'AUTOINSTANCESSHUTDOWN';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: AUTO_INSTANCES_SHUTDOWN_TABLE_SEED,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: AUTO_INSTANCES_SHUTDOWN_TABLE_SEED,
    value: true,
  });
};

export const seedAutoInstancesShutdownTable = async (): Promise<void> => {
  if (await tableAlreadyCreated()) {
    logger.info('Skip: Auto instances shutdown table already seeded', {
      name: 'seedAutoInstancesShutdownTable',
    });
    return;
  }

  const tablesContext = await getAdminTablesContext();
  const table = await getTableByName(
    SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME,
    tablesContext,
  );

  if (!table) {
    await createAutoInstancesShutdownTable(tablesContext);
  }

  await setTableSeedFlag();
};
