/* TODO: remove this when all environments are migrated */

import {
  authenticateDefaultUserInOpenOpsTables,
  createAxiosHeaders,
  getTableIdByTableName,
  makeOpenOpsTablesDelete,
  OPENOPS_DEFAULT_DATABASE_NAME,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { seedTemplateTablesService } from '../../openops-tables/template-tables/seed-tables-for-templates';
import { databaseConnection } from '../database-connection';

const OPENOPS_OPPORTUNITIES_TABLE_RECREATED = 'OPPORTUNITIES_RECREATED';

const isOpenopsOpportuntiesAlreadyRecreatred = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const tablesSeedsFlag = await flagRepo.findOneBy({
    id: OPENOPS_OPPORTUNITIES_TABLE_RECREATED,
  });
  return tablesSeedsFlag?.value === true;
};

const setOpportunitiesTableDeleted = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: OPENOPS_DEFAULT_DATABASE_NAME,
    value: true,
  });
};

export const updateOpportunitiesTable = async (): Promise<void> => {
  if (await isOpenopsOpportuntiesAlreadyRecreatred()) {
    logger.info('Skip: OpenOps Opportunities table already recreated.', {
      name: 'openOpsOpportunitiesTableAlreadyRecreated',
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
    await seedTemplateTablesService.createOpportunityTemplateTable();

    await setOpportunitiesTableDeleted();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === `Table '${SEED_OPENOPS_TABLE_NAME}' not found`
    ) {
      logger.info(
        'Skip: OpenOps recreation of opportunities table, new environemnt.',
        {
          name: 'openOpsOpportunitiesTableAlreadyRecreated',
        },
      );
    } else {
      logger.error(
        'An error occurred recreating the opportunities table.',
        error,
      );
    }
  }
};
