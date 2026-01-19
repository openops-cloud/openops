import { analyticsAccessService } from './access-service';

export type AnalyticsAccessService = {
  verifyUserAnalyticsAccess(
    openopsUserId: string,
    projectId: string,
  ): Promise<void> | void;
};

export const getAnalyticsAccessService = (): AnalyticsAccessService => {
  return analyticsAccessService;
};
