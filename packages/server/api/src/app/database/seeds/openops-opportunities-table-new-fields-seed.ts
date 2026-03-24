import {
  createAxiosHeaders,
  getTableByName,
  makeOpenOpsTablesPost,
  resolveTokenProvider,
  TablesServerContext,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { FlagEntity } from '../../flags/flag.entity';
import { SEED_OPENOPS_TABLE_NAME } from '../../openops-tables/template-tables/create-opportunities-table';
import { databaseConnection } from '../database-connection';
import { applyToEachTablesDatabase } from './tables-database-iterator';

const OPPORTUNITIES_NEW_FIELDS_SEED = 'OPP_NEW_FIELDS_SEED';

const alreadyApplied = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const flag = await flagRepo.findOneBy({ id: OPPORTUNITIES_NEW_FIELDS_SEED });
  return flag?.value === true;
};

const setFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  await flagRepo.save({ id: OPPORTUNITIES_NEW_FIELDS_SEED, value: true });
};

export const seedOpportunitiesNewFields = async (): Promise<void> => {
  if (await alreadyApplied()) {
    logger.info('Skip: Opportunities new fields already seeded', {
      name: 'seedOpportunitiesNewFields',
    });
    return;
  }

  await applyToEachTablesDatabase(
    async (tablesContext: TablesServerContext): Promise<void> => {
      const table = await getTableByName(
        SEED_OPENOPS_TABLE_NAME,
        tablesContext,
      );

      if (!table) {
        return;
      }

      const tokenOrResolver = await resolveTokenProvider(tablesContext);
      const createField = (field: object) =>
        makeOpenOpsTablesPost(
          `api/database/fields/table/${table.id}/`,
          field,
          createAxiosHeaders(tokenOrResolver),
        );

      await createField({ name: 'Campaign ID', type: 'text' });
      await createField({
        name: 'Last status change at',
        type: 'date',
        date_format: 'ISO',
        date_include_time: true,
      });
    },
  );

  await setFlag();
};
