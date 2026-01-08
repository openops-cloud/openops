import { analyticsAccessService } from './basic/analytics-access-service';

export type AnalyticsAccessService = {
  verifyUserAnalyticsAccess(openopsUserId: string): Promise<void> | void;
};

export const getAnalyticsAccessService = (): AnalyticsAccessService => {
  return analyticsAccessService;
};
