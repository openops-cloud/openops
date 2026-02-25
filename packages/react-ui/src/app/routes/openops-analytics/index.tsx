import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { useCandu } from '@/app/features/extensions/candu/use-candu';
import { FlagId } from '@openops/shared';

import {
  AnalyticsDashboardEmptyState,
  AnalyticsDashboardSelector,
} from '@openops/components/ui';
import { AnaloyticsLoadingState } from './analytics-loading-state';
import './openops-analytics.css';
import { useAnalyticsDashboard } from './use-analytics-dashboard';
import { useEmbedDashboard } from './use-embed-dashboard';

const OpenOpsAnalyticsPage = () => {
  useDefaultSidebarState('minimized');

  const { isCanduEnabled, canduClientToken, canduUserId } = useCandu();
  const { data: analyticsPublicUrl } = flagsHooks.useFlag<string | undefined>(
    FlagId.ANALYTICS_PUBLIC_URL,
  );

  const {
    dashboardRegistry,
    selectedDashboardId,
    selectedDashboard,
    isLoading,
    handleDashboardChange,
  } = useAnalyticsDashboard();

  const { iframeContainerRef } = useEmbedDashboard({
    analyticsPublicUrl,
    selectedDashboard,
    isCanduEnabled,
    canduClientToken,
    canduUserId,
  });

  if (!analyticsPublicUrl) {
    console.error('OpenOps Analytics URL is not defined');
    return null;
  }

  if (isLoading) {
    <AnaloyticsLoadingState />;
  }

  const dashboards = dashboardRegistry?.dashboards ?? [];

  if (!selectedDashboard) {
    return (
      <AnalyticsDashboardEmptyState
        dashboards={dashboards}
        onDashboardChange={handleDashboardChange}
      />
    );
  }

  return (
    <div className="size-full flex flex-col h-full">
      <AnalyticsDashboardSelector
        dashboards={dashboards}
        selectedDashboardId={selectedDashboardId ?? ''}
        onDashboardChange={handleDashboardChange}
      />
      <div className="flex-1" ref={iframeContainerRef} />
    </div>
  );
};

export { OpenOpsAnalyticsPage };
