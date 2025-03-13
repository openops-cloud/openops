import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const OPPORTUNITIES_TABLE_SEED = 'OPPORTUNITYSEED';

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

  await seedTemplateTablesService.createOpportunityTemplateTable();

  await setTableSeedFlag();
};
