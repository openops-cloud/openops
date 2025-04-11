/* TODO: remove this when all environments are migrated */

import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { openopsTables } from '../../openops-tables';
import { databaseConnection } from '../database-connection';

import {
  authenticateDefaultUserInOpenOpsTables,
  axiosTablesSeedRetryConfig,
  getDefaultDatabaseId,
  OPENOPS_DEFAULT_DATABASE_NAME,
} from '@openops/common';

const OPENOPS_TABLES_DATABASE_RENAMED_FLAG = 'TABLES_DB_RENAMED';
const isOpenopsTablesDatabaseAlreadyRenamed = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedsFlag = await flagRepo.findOneBy({
    id: OPENOPS_TABLES_DATABASE_RENAMED_FLAG,
  });
  return tablesSeedsFlag?.value === true;
};

const setOpenopsTablesDatabaseRenamedFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: OPENOPS_TABLES_DATABASE_RENAMED_FLAG,
    value: true,
  });
};

export const OLD_OPENOPS_DEFAULT_DATABASE_NAME = 'OpenOps Database';

export const updateOpenopsTablesDatabase = async (): Promise<void> => {
  if (await isOpenopsTablesDatabaseAlreadyRenamed()) {
    logger.info('Skip: Openops Tables Database already renamed', {
      name: 'openopsTablesDatabaseAlreadyRenamed',
    });
    return;
  }

  const { token } = await authenticateDefaultUserInOpenOpsTables(
    axiosTablesSeedRetryConfig,
  );

  try {
    const tablesDatabaseId = await getDefaultDatabaseId(
      token,
      OLD_OPENOPS_DEFAULT_DATABASE_NAME,
    );

    await openopsTables.renameDatabase(
      tablesDatabaseId,
      OPENOPS_DEFAULT_DATABASE_NAME,
      token,
    );
    await setOpenopsTablesDatabaseRenamedFlag();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === 'Default database not found'
    ) {
      logger.info('Skip: Openops Tables Database rename, new deployment', {
        name: 'newDeploymentSkipRenameOpenopsTablesDatabase',
      });
    } else {
      logger.error(
        'An error occurred renaming OpenOps Tables database.',
        error,
      );
    }
  }
};
