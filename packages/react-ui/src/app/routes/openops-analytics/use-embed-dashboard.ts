import { embedDashboard } from '@superset-ui/embedded-sdk';
import { useEffect, useRef } from 'react';

import { authenticationApi } from '@/app/lib/authentication-api';
import { AnalyticsDashboard } from '@openops/shared';

interface UseEmbedDashboardParams {
  analyticsPublicUrl: string | null | undefined;
  selectedDashboard: AnalyticsDashboard | undefined;
  isCanduEnabled: string | boolean | null | undefined;
  canduClientToken: string | null | undefined;
  canduUserId: string | null | undefined;
}

const buildDashboardUiConfig = (parentData: string) => ({
  hideTitle: true,
  hideChartControls: false,
  hideTab: false,
  filters: {
    expanded: false,
    visible: false,
  },
  urlParams: { parentData },
});

const encodeParentData = (
  isCanduEnabled: string | boolean | null | undefined,
  canduUserId: string | null | undefined,
  canduClientToken: string | null | undefined,
) =>
  encodeURIComponent(
    JSON.stringify({ isCanduEnabled, userId: canduUserId, canduClientToken }),
  );

export const useEmbedDashboard = ({
  analyticsPublicUrl,
  selectedDashboard,
  isCanduEnabled,
  canduClientToken,
  canduUserId,
}: UseEmbedDashboardParams) => {
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const parentData = encodeParentData(
    isCanduEnabled,
    canduUserId,
    canduClientToken,
  );

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
      dashboardUiConfig: buildDashboardUiConfig(parentData),
    });
  }, [analyticsPublicUrl, selectedDashboard?.embedId, parentData]);

  return { iframeContainerRef };
};
