import { AnalyticsDashboard } from '@openops/shared';
import { t } from 'i18next';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';
import { AnalyticsDashboardSelector } from './analytics-dashboard-selector';

type AnalyticsEmptyStateProps = {
  dashboards: AnalyticsDashboard[];
  onDashboardChange: (dashboardId: string) => void;
};

export const AnalyticsDashboardEmptyState = ({
  dashboards,
  onDashboardChange,
}: AnalyticsEmptyStateProps) => {
  const message =
    dashboards.length === 0
      ? t('No dashboards are available.')
      : t('Unable to load the selected dashboard. Please choose another.');

  const infoIcon = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="size-4 text-muted-foreground cursor-default" />
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (dashboards.length === 0) {
    return (
      <div className="size-full flex items-center justify-center">
        {infoIcon}
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col h-full">
      <div className="flex items-center gap-2">
        <AnalyticsDashboardSelector
          dashboards={dashboards}
          selectedDashboardId=""
          onDashboardChange={onDashboardChange}
        />
        {infoIcon}
      </div>
      <div className="flex-1" />
    </div>
  );
};

AnalyticsDashboardEmptyState.displayName = 'AnalyticsDashboardEmptyState';
