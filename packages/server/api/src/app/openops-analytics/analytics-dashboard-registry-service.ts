import { fetchFinopsDashboardEmbedDetails } from '@openops/common';
import { logger } from '@openops/server-shared';
import {
  AnalyticsDashboard,
  AnalyticsDashboardRegistry,
  FlagId,
  OPENOPS_ANALYTICS_FINOPS_SLUG,
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

async function buildFinopsDashboardRegistryEntry(
  accessToken: string,
): Promise<AnalyticsDashboard> {
  const {
    result: { uuid: embedId },
  } = await fetchFinopsDashboardEmbedDetails(accessToken);
  return {
    id: OPENOPS_ANALYTICS_FINOPS_SLUG,
    name: 'FinOps',
    slug: OPENOPS_ANALYTICS_FINOPS_SLUG,
    embedId,
    enabled: true,
  };
}

export async function upsertDashboard(
  entry: AnalyticsDashboard,
  accessToken: string,
): Promise<void> {
  const registry = await getAnalyticsDashboardRegistry();

  if (!registry) {
    const finopsEntry = await buildFinopsDashboardRegistryEntry(accessToken);
    const dashboards =
      entry.id === OPENOPS_ANALYTICS_FINOPS_SLUG
        ? [entry]
        : [finopsEntry, entry];
    await saveAnalyticsDashboardRegistry({
      dashboards,
      defaultDashboardId: OPENOPS_ANALYTICS_FINOPS_SLUG,
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
