import { FlagId } from '@openops/shared';
import { useMemo } from 'react';
import { flagsHooks } from './flags-hooks';
import { userHooks } from './user-hooks';

export const useHasAnalyticsAccess = (): boolean => {
  const { data: isAnalyticsEnabled } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.ANALYTICS_ENABLED,
  );

  const { userMeta } = userHooks.useUserMeta();
  const hasAnalyticsAccess = userMeta?.projectPermissions?.analytics ?? false;

  return useMemo(
    () => Boolean(isAnalyticsEnabled && hasAnalyticsAccess),
    [isAnalyticsEnabled, hasAnalyticsAccess],
  );
};
