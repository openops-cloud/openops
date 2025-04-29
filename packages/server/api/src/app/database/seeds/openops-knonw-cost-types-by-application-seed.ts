import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME } from '../../openops-tables/template-tables/create-known-cost-types-by-application-table';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const KNOWN_COST_TYPES_BY_APPLICATION = 'KNOWNCOSTTYPES';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: KNOWN_COST_TYPES_BY_APPLICATION,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: KNOWN_COST_TYPES_BY_APPLICATION,
    value: true,
  });
};

export const seedKnownCostTypesByApplicationTable = async (): Promise<void> => {
  if (await tableAlreadyCreated()) {
    logger.info(
      `Skip: ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} already seeded`,
    );
    return;
  }

  const table = await getTableByName(
    SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME,
  );

  if (!table) {
    await seedTemplateTablesService.createKnownCostTypesByApplicationTable();
  }

  await setTableSeedFlag();
};
