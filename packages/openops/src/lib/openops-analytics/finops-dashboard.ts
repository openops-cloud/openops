import { OPENOPS_ANALYTICS_FINOPS_SLUG } from '@openops/shared';
import { AxiosHeaders } from 'axios';
import {
  makeOpenOpsAnalyticsGet,
  makeOpenOpsAnalyticsPost,
} from './requests-helpers';

export interface AnalyticsGuestToken {
  token: string;
}

interface AnalyticsEmbedDetailsResponse {
  result: {
    uuid: string;
  };
}

export async function fetchFinopsDashboardEmbedDetails(
  accessToken: string,
): Promise<AnalyticsEmbedDetailsResponse> {
  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  });

  return makeOpenOpsAnalyticsGet<AnalyticsEmbedDetailsResponse>(
    `dashboard/${OPENOPS_ANALYTICS_FINOPS_SLUG}/embedded`,
    headers,
  );
}

export async function fetchGuestTokenInOpenOpsAnalytics(
  accessToken: string,
  dashboardEmbedUuid: string,
): Promise<AnalyticsGuestToken> {
  const requestBody = {
    resources: [
      {
        type: 'dashboard',
        id: dashboardEmbedUuid,
      },
    ],
    rls: [],
    user: {
      username: 'openops_user',
      first_name: 'OpenOps',
      last_name: 'User',
    },
  };

  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  });

  return makeOpenOpsAnalyticsPost<AnalyticsGuestToken>(
    'security/guest_token/',
    requestBody,
    headers,
  );
}
