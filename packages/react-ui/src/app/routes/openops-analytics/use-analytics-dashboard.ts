import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { authenticationApi } from '@/app/lib/authentication-api';
import {
  AnalyticsDashboard,
  AnalyticsDashboardId,
  AnalyticsDashboardRegistry,
  FlagId,
} from '@openops/shared';

export const useAnalyticsDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: dashboardRegistry } =
    flagsHooks.useFlag<AnalyticsDashboardRegistry | null>(
      FlagId.ANALYTICS_DASHBOARDS,
    );

  const { data: fallbackEmbedId } = useQuery({
    queryKey: ['analytics-fallback-embed-id'],
    queryFn: () => authenticationApi.fetchAnalyticsEmbedId(),
    enabled: !dashboardRegistry,
    staleTime: Infinity,
  });

  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!dashboardRegistry) {
      return;
    }

    const urlDashboardId = searchParams.get('dashboard');
    const validDashboard = dashboardRegistry.dashboards.find(
      (d) => d.id === urlDashboardId && d.enabled,
    );

    if (validDashboard) {
      setSelectedDashboardId(validDashboard.id);
    } else if (!selectedDashboardId) {
      setSelectedDashboardId(dashboardRegistry.defaultDashboardId);
    }
  }, [dashboardRegistry, searchParams, selectedDashboardId]);

  const handleDashboardChange = (dashboardId: string) => {
    setSelectedDashboardId(dashboardId);
    setSearchParams({ dashboard: dashboardId });
  };

  const registryDashboard = dashboardRegistry?.dashboards.find(
    (d) => d.id === selectedDashboardId,
  );

  const fallbackDashboard: AnalyticsDashboard | undefined =
    !dashboardRegistry && fallbackEmbedId
      ? {
          id: AnalyticsDashboardId.FINOPS,
          name: 'FinOps',
          embedId: fallbackEmbedId,
          slug: AnalyticsDashboardId.FINOPS,
          enabled: true,
        }
      : undefined;

  const selectedDashboard = registryDashboard ?? fallbackDashboard;

  return {
    dashboardRegistry,
    selectedDashboardId,
    selectedDashboard,
    handleDashboardChange,
  };
};
