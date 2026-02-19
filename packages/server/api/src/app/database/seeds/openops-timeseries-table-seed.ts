import { getTableByName, TablesServerContext } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import {
  createTimeseriesTable,
  TIMESERIES_TABLE_NAME,
} from '../../openops-tables/template-tables/create-timeseries-table';
import { databaseConnection } from '../database-connection';
import { applyToEachTablesDatabase } from './tables-database-iterator';

const TIMESERIES_TABLE_SEED = 'TIMESERIES_TABLE_SEED';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: TIMESERIES_TABLE_SEED,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: TIMESERIES_TABLE_SEED,
    value: true,
  });
};

export const seedTimeseriesTemplateTable = async (): Promise<void> => {
  if (await tableAlreadyCreated()) {
    logger.info('Skip: Timeseries table already seeded', {
      name: 'seedTimeseriesTable',
    });
    return;
  }

  await applyToEachTablesDatabase(
    async (tablesContext: TablesServerContext): Promise<void> => {
      const table = await getTableByName(TIMESERIES_TABLE_NAME, tablesContext);

      if (!table) {
        await createTimeseriesTable(tablesContext);
      }
    },
  );

  await setTableSeedFlag();
};
