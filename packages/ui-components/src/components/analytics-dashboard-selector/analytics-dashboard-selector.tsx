import { AnalyticsDashboard } from '@openops/shared';
import { t } from 'i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

interface AnalyticsDashboardSelectorProps {
  dashboards: AnalyticsDashboard[];
  selectedDashboardId: string;
  onDashboardChange: (dashboardId: string) => void;
}

export const AnalyticsDashboardSelector = ({
  dashboards,
  selectedDashboardId,
  onDashboardChange,
}: AnalyticsDashboardSelectorProps) => {
  const enabledDashboards = dashboards.filter((d) => d.enabled);

  if (enabledDashboards.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
      <span className="text-sm text-muted-foreground">{t('Dashboard')}:</span>
      <Select value={selectedDashboardId} onValueChange={onDashboardChange}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder={t('Select dashboard')} />
        </SelectTrigger>
        <SelectContent>
          {enabledDashboards.map((dashboard) => (
            <SelectItem key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
