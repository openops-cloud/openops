import { AppSystemProp, logger, system } from '@openops/server-shared';
import { analyticsAuthenticationService } from '../../authentication/analytics-authentication-service';
import { FlagEntity } from '../../flags/flag.entity';
import { databaseConnection } from '../database-connection';

const ANALYTICS_DATA_SEEDED_FLAG = 'ANALYTICS_DATA_SEEDED';

const analyticsDataAlreadySeeded = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const analyticsSeedsFlag = await flagRepo.findOneBy({
    id: ANALYTICS_DATA_SEEDED_FLAG,
  });
  return analyticsSeedsFlag?.value === true;
};

const setAnalyticsDataSeededFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: ANALYTICS_DATA_SEEDED_FLAG,
    value: true,
  });
};

export const seedAnalytics = async (): Promise<void> => {
  if (!system.isAnalyticsEnabled()) {
    logger.info('Skipping analytics seeding, analytics disabled');
    return;
  }

  if (!system.get(AppSystemProp.ANALYTICS_PRIVATE_URL)) {
    logger.info('Skipping analytics seeding, no configured private URL');
    return;
  }

  if (await analyticsDataAlreadySeeded()) {
    logger.info({ name: 'seedAnalyticsData' }, 'skip: already seeded');
    return;
  }

  await analyticsAuthenticationService.signUp();

  await setAnalyticsDataSeededFlag();
};
