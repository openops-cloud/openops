import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const TEMPLATE_TABLES_SEED = 'TEMPLATE_TABLES_SEED';

const tablesAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: TEMPLATE_TABLES_SEED,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: TEMPLATE_TABLES_SEED,
    value: true,
  });
};

export const seedTemplateTables = async (): Promise<void> => {
  if (await tablesAlreadyCreated()) {
    logger.info('Skip: Template tables already seeded', {
      name: 'seedTemplateTables',
    });
    return;
  }

  await seedTemplateTablesService.createBaseTemplateTables();

  await setTableSeedFlag();
};
