import { AppSystemProp, logger, system } from '@openops/server-shared';
import { Provider } from '@openops/shared';
import { getAuthenticationService } from '../../authentication/authentication-service-factory';
import { FlagEntity } from '../../flags/flag.entity';
import { databaseConnection } from '../database-connection';

const DEV_DATA_SEEDED_FLAG = 'DEV_DATA_SEEDED';

const devSeedingEnabled = (): boolean => {
  return system.getBoolean(AppSystemProp.SEED_DEV_DATA) ?? false;
};

const devDataAlreadySeeded = async (): Promise<boolean> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const devSeedsFlag = await flagRepo.findOneBy({ id: DEV_DATA_SEEDED_FLAG });
  return devSeedsFlag?.value === true;
};

const setDevDataSeededFlag = async (): Promise<void> => {
  const flagRepo = databaseConnection().getRepository(FlagEntity);

  await flagRepo.save({
    id: DEV_DATA_SEEDED_FLAG,
    value: true,
  });
};

const seedDevUser = async (): Promise<void> => {
  const DEV_EMAIL = 'dev@openops.com';
  const DEV_PASSWORD = '12345678';

  await getAuthenticationService().signUp({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    firstName: 'Dev',
    lastName: 'User',
    trackEvents: false,
    newsLetter: false,
    verified: true,
    organizationId: null,
    provider: Provider.EMAIL,
  });

  logger.info(
    { name: 'seedDevUser' },
    `email=${DEV_EMAIL} pass=${DEV_PASSWORD}`,
  );
};

export const seedDevData = async (): Promise<void> => {
  if (!devSeedingEnabled()) {
    logger.info({ name: 'seedDevData' }, 'skip: dev data seeding disabled');
    return;
  }

  if (await devDataAlreadySeeded()) {
    logger.info({ name: 'seedDevData' }, 'skip: already seeded');
    return;
  }

  await seedDevUser();
  await setDevDataSeededFlag();
};
