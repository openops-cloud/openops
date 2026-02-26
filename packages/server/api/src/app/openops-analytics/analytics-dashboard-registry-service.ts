import { logger } from '@openops/server-shared';
import {
  AnalyticsDashboard,
  AnalyticsDashboardRegistry,
  FlagId,
} from '@openops/shared';
import { databaseConnection } from '../database/database-connection';
import { FlagEntity } from '../flags/flag.entity';

async function saveAnalyticsDashboardRegistry(
  registry: AnalyticsDashboardRegistry,
): Promise<void> {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  await flagRepo.save({ id: FlagId.ANALYTICS_DASHBOARDS, value: registry });
}

async function getAnalyticsDashboardRegistry(): Promise<
  AnalyticsDashboardRegistry | undefined
> {
  const flagRepo = databaseConnection().getRepository(FlagEntity);
  const flag = await flagRepo.findOneBy({ id: FlagId.ANALYTICS_DASHBOARDS });
  return flag?.value as AnalyticsDashboardRegistry | undefined;
}

export async function registerDashboard(
  entry: AnalyticsDashboard,
): Promise<void> {
  const registry = await getAnalyticsDashboardRegistry();

  if (!registry) {
    await saveAnalyticsDashboardRegistry({
      dashboards: [entry],
      defaultDashboardId: entry.id,
    });

    logger.info('Analytics dashboard registry created', {
      dashboardId: entry.id,
    });

    return;
  }

  const existingIndex = registry.dashboards.findIndex((d) => d.id === entry.id);
  if (existingIndex >= 0) {
    registry.dashboards[existingIndex] = entry;
  } else {
    registry.dashboards.push(entry);
  }

  await saveAnalyticsDashboardRegistry(registry);

  logger.info('Updated analytics dashboard registry', {
    dashboardId: entry.id,
  });
}
