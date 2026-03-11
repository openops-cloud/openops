import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userHooks } from '@/app/common/hooks/user-hooks';
import { FlagId } from '@openops/shared';
import { useMemo } from 'react';

export const useShowBenchmarkBanner = () => {
  const { data: isFinOpsBenchmarkEnabled } = flagsHooks.useFlag<
    boolean | undefined
  >(FlagId.FINOPS_BENCHMARK_ENABLED);

  const { userMeta, isPending } = userHooks.useUserMeta();
  const hasBenchmarkAccess = userMeta?.projectPermissions?.benchmark ?? false;

  return useMemo(
    () => ({
      showBanner: Boolean(isFinOpsBenchmarkEnabled && hasBenchmarkAccess),
      isPending,
    }),
    [isFinOpsBenchmarkEnabled, hasBenchmarkAccess, isPending],
  );
};
