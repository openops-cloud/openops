import {
  AnalyticsAuthTokens,
  authenticateOpenOpsAnalyticsAdmin,
} from '@openops/common';
import { seedAnalyticsDashboards } from '../openops-analytics/analytics-seeding-service';
import { getAnalyticsAccessService } from './analytics-access-service-factory';
import { ProjectContext } from './types';

export type AnalyticsAccessContext = {
  authTokens: AnalyticsAuthTokens;
  projectContext: ProjectContext;
};

export const analyticsAuthenticationService = {
  async signUp(): Promise<AnalyticsAuthTokens> {
    await seedAnalyticsDashboards();

    return authenticateOpenOpsAnalyticsAdmin();
  },

  async authenticateAnalyticsRequest(
    userId: string,
  ): Promise<AnalyticsAuthTokens> {
    await getAnalyticsAccessService().verifyUserAnalyticsAccess(userId);
    const authTokens = await authenticateOpenOpsAnalyticsAdmin();

    return authTokens;
  },
};
