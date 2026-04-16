import { embedDashboard } from '@superset-ui/embedded-sdk';
import { useEffect, useRef } from 'react';

import { authenticationApi } from '@/app/lib/authentication-api';
import { AnalyticsDashboard } from '@openops/shared';

interface UseEmbedDashboardParams {
  analyticsPublicUrl: string | null | undefined;
  selectedDashboard: AnalyticsDashboard | undefined;
}

const buildDashboardUiConfig = () => ({
  hideTitle: true,
  hideChartControls: false,
  hideTab: false,
  filters: {
    expanded: false,
    visible: false,
  },
});

export const useEmbedDashboard = ({
  analyticsPublicUrl,
  selectedDashboard,
}: UseEmbedDashboardParams) => {
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyticsPublicUrl || !selectedDashboard?.embedId) {
      return;
    }

    const mountPoint = iframeContainerRef.current;
    if (!mountPoint) {
      return;
    }

    mountPoint.innerHTML = '';

    embedDashboard({
      id: selectedDashboard.embedId,
      supersetDomain: `${analyticsPublicUrl}/openops-analytics`,
      mountPoint,
      fetchGuestToken: () =>
        authenticationApi.fetchAnalyticsGuestToken(selectedDashboard.embedId),
      dashboardUiConfig: buildDashboardUiConfig(),
    });
  }, [analyticsPublicUrl, selectedDashboard?.embedId]);

  return { iframeContainerRef };
};
