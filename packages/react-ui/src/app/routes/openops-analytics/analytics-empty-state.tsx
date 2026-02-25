import { AnalyticsDashboardSelector } from '@openops/components/ui';
import { AnalyticsDashboard } from '@openops/shared';
import { t } from 'i18next';

type AnalyticsEmptyStateProps = {
  dashboards: AnalyticsDashboard[];
  selectedDashboardId: string;
  onDashboardChange: (dashboardId: string) => void;
};

const AnalyticsEmptyState = ({
  dashboards,
  selectedDashboardId,
  onDashboardChange,
}: AnalyticsEmptyStateProps) => {
  return (
    <div className="size-full flex flex-col h-full">
      {dashboards.length > 0 && (
        <AnalyticsDashboardSelector
          dashboards={dashboards}
          selectedDashboardId={selectedDashboardId}
          onDashboardChange={onDashboardChange}
        />
      )}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">
          {dashboards.length === 0
            ? t('No dashboards are available.')
            : t(
                'Unable to load the selected dashboard. Please choose another.',
              )}
        </span>
      </div>
    </div>
  );
};

export { AnalyticsEmptyState };
