/* TODO: remove this when all environments are migrated */

import {
  authenticateDefaultUserInOpenOpsTables,
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  getTableByName,
  makeOpenOpsTablesDelete,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { databaseConnection } from '../database-connection';

const OPENOPS_OLD_OPPORTUNITIES_TABLE_DELETED = 'OPPORTUNITYDEL1';

const isTableAlreadyDeleted = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedsFlag = await flagRepo.findOneBy({
    id: OPENOPS_OLD_OPPORTUNITIES_TABLE_DELETED,
  });
  return tablesSeedsFlag?.value === true;
};

const newTableWasAlreadyCreated = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedFlag = await flagRepo.findOneBy({
    id: 'OPPORTUNITYSEED',
  });
  return tablesSeedFlag?.value === true;
};

const setOldOpportunitiesTableDeleted = async (): Promise<void> => {
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

  if (await newTableWasAlreadyCreated()) {
    await setOldOpportunitiesTableDeleted();
    return;
  }

  try {
    const { token } = await authenticateDefaultUserInOpenOpsTables(
      axiosTablesSeedRetryConfig,
    );

    const table = await getTableByName(SEED_OPENOPS_TABLE_NAME);
    if (!table) {
      logger.info('Skip: OpenOps deletion of old opportunities table', {
        name: 'deleteOldOpportunitiesTable',
      });
    } else {
      await makeOpenOpsTablesDelete<unknown>(
        `api/database/tables/${table.id}/`,
        createAxiosHeaders(token),
        axiosTablesSeedRetryConfig,
      );
    }

    await setOldOpportunitiesTableDeleted();
  } catch (error: unknown) {
    logger.error('An error occurred deleting old opportunities table.', error);
  }
};
