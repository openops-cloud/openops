import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import {
  createOpportunitiesTable,
  SEED_OPENOPS_TABLE_NAME,
} from '../../openops-tables/template-tables/create-opportunities-table';
import { databaseConnection } from '../database-connection';
import { getAdminTablesContext } from './get-admin-token-and-database';

const OPPORTUNITIES_TABLE_SEED = 'OPPORTUNITIESSEED';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: OPPORTUNITIES_TABLE_SEED,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: OPPORTUNITIES_TABLE_SEED,
    value: true,
  });
};

export const seedOpportunitesTemplateTable = async (): Promise<void> => {
  if (await tableAlreadyCreated()) {
    logger.info('Skip: Opportunity table already seeded', {
      name: 'seedOpportunityTable',
    });
    return;
  }

  const tablesContext = await getAdminTablesContext();

  const table = await getTableByName(SEED_OPENOPS_TABLE_NAME, tablesContext);

  if (!table) {
    await createOpportunitiesTable(tablesContext);
  }

  await setTableSeedFlag();
};
