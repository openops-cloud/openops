import { FlagId } from '@openops/shared';
import { useMemo } from 'react';
import { flagsHooks } from './flags-hooks';
import { userHooks } from './user-hooks';

export const useHasAnalyticsAccess = () => {
  const { data: isAnalyticsEnabled } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.ANALYTICS_ENABLED,
  );

  const { userMeta, isPending } = userHooks.useUserMeta();
  const hasAnalyticsAccess = userMeta?.projectPermissions?.analytics ?? false;

  return useMemo(
    () => ({
      hasAnalyticsAccess: Boolean(isAnalyticsEnabled && hasAnalyticsAccess),
      isPending,
    }),
    [isAnalyticsEnabled, hasAnalyticsAccess, isPending],
  );
};
