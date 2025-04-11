import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_TABLE_NAME } from '../../openops-tables/template-tables/create-aggregated-costs-table';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

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

    const table = await getTableByName(SEED_TABLE_NAME);

    if (!table) {
      await seedTemplateTablesService.createAggregatedCostsTable();
    }

    await setTableSeedFlag();
  };
