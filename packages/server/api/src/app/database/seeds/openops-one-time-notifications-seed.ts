import { getTableByName } from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const ONE_TIME_NOTIFICATIONS = 'ONE_TIME_NOTIFICATIONS_SEEDED';

const tableAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: ONE_TIME_NOTIFICATIONS,
  });
  return tablesSeedFlag?.value === true;
};

const setTableSeedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: ONE_TIME_NOTIFICATIONS,
    value: true,
  });
};

export const createOneTimeNotificationsTable = async (): Promise<void> => {
  if (await tableAlreadyCreated()) {
    logger.info(`Skip: ${ONE_TIME_NOTIFICATIONS} already seeded`);
    return;
  }

  const table = await getTableByName(ONE_TIME_NOTIFICATIONS);

  if (!table) {
    await seedTemplateTablesService.createOneTimeNotificationsTable();
  }

  await setTableSeedFlag();
};
