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

const OPPORTUNITIES_CAMPAIGN_ID_SEED = 'OPP_CAMPAIGN_ID_SEED';

const alreadyApplied = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const flag = await flagRepo.findOneBy({ id: OPPORTUNITIES_CAMPAIGN_ID_SEED });
  return flag?.value === true;
};

const setFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  await flagRepo.save({ id: OPPORTUNITIES_CAMPAIGN_ID_SEED, value: true });
};

export const seedOpportunitiesCampaignIdField = async (): Promise<void> => {
  if (await alreadyApplied()) {
    logger.info('Skip: Opportunities Campaign ID field already seeded', {
      name: 'seedOpportunitiesCampaignIdField',
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
      await makeOpenOpsTablesPost(
        `api/database/fields/table/${table.id}/`,
        { name: 'Campaign ID', type: 'text' },
        createAxiosHeaders(tokenOrResolver),
      );
    },
  );

  await setFlag();
};
