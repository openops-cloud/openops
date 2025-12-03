import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import {
  createAggregatedCostsTable,
  SEED_TABLE_NAME,
} from '../../openops-tables/template-tables/create-aggregated-costs-table';
import { databaseConnection } from '../database-connection';
import { getDefaultProjectTablesDatabaseToken } from '../get-default-user-db-token';
import { getAdminTokenAndDatabaseId } from './get-admin-token-and-database';

const AGGREGATED_TABLE_SEED = 'AGGREGATEDCOSTS';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: AGGREGATED_TABLE_SEED,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: AGGREGATED_TABLE_SEED,
    value: true,
  });
};

export const seedFocusDataAggregationTemplateTable =
  async (): Promise<void> => {
    if (await tableAlreadyCreated()) {
      logger.info(`Skip: ${SEED_TABLE_NAME} already seeded`);
      return;
    }

    const table = await getTableByName(
      SEED_TABLE_NAME,
      await getDefaultProjectTablesDatabaseToken(),
    );

    if (!table) {
      const tokenAndDatabaseId = await getAdminTokenAndDatabaseId();
      await createAggregatedCostsTable(tokenAndDatabaseId);
    }

    await setTableSeedFlag();
  };
