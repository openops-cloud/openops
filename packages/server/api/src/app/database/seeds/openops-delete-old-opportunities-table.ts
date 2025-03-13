/* TODO: remove this when all environments are migrated */

import {
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
  getTableIdByTableName,
  makeOpenOpsTablesDelete,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { databaseConnection } from '../database-connection';

const OPENOPS_OLD_OPPORTUNITIES_TABLE_DELETED = 'OPPORTUNITYDEL';

const isTableAlreadyDeleted = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedsFlag = await flagRepo.findOneBy({
    id: OPENOPS_OLD_OPPORTUNITIES_TABLE_DELETED,
  });
  return tablesSeedsFlag?.value === true;
};

const setOpportunitiesTableDeleted = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: OPENOPS_OLD_OPPORTUNITIES_TABLE_DELETED,
    value: true,
  });
};

export const deleteOldOpportunitiesTable = async (): Promise<void> => {
  if (await isTableAlreadyDeleted()) {
    logger.info('Skip: OpenOps Old Opportunities table already deleted.', {
      name: 'deleteOldOpportunitiesTable',
    });
    return;
  }

  try {
    const { token } = await authenticateDefaultUserInOpenOpsTables();

    const opportunitiesTableIdOld = await getTableIdByTableName(
      SEED_OPENOPS_TABLE_NAME,
    );

    await makeOpenOpsTablesDelete<unknown>(
      `api/database/tables/${opportunitiesTableIdOld}/`,
      createAxiosHeaders(token),
    );
    await setOpportunitiesTableDeleted();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === `Table '${SEED_OPENOPS_TABLE_NAME}' not found`
    ) {
      logger.info('Skip: OpenOps deletion of old opportunities table', {
        name: 'deleteOldOpportunitiesTable',
      });
    } else {
      logger.error(
        'An error occurred deleting old opportunities table.',
        error,
      );
    }
  }
};
