import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { useCandu } from '@/app/features/extensions/candu/use-candu';
import { FlagId } from '@openops/shared';

import { AnalyticsDashboardSelector } from '@openops/components/ui';
import { t } from 'i18next';
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
    return null;
  }

  if (!selectedDashboard) {
    return (
      <div className="size-full flex items-center justify-center">
        <span className="text-muted-foreground">
          {t('Loading dashboards...')}
        </span>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col h-full">
      <AnalyticsDashboardSelector
        dashboards={dashboardRegistry?.dashboards ?? []}
        selectedDashboardId={selectedDashboardId ?? ''}
        onDashboardChange={handleDashboardChange}
      />
      <div className="flex-1" ref={iframeContainerRef} />
    </div>
  );
};

export { OpenOpsAnalyticsPage };
