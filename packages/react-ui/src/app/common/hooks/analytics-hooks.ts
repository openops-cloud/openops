import { authenticationSession } from '@/app/lib/authentication-session';
import { FlagId } from '@openops/shared';
import { useMemo } from 'react';
import { flagsHooks } from './flags-hooks';

export const useHasAnalyticsAccess = (): boolean => {
  const { data: isAnalyticsEnabled } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.ANALYTICS_ENABLED,
  );

  const hasAnalyticsPrivileges =
    authenticationSession.getUserHasAnalyticsPrivileges();

  return useMemo(
    () => Boolean(isAnalyticsEnabled && hasAnalyticsPrivileges),
    [isAnalyticsEnabled, hasAnalyticsPrivileges],
  );
};
