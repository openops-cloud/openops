import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { FlagId } from '@openops/shared';

export const useShowBenchmarkBanner = () => {
  const { data: isFinOpsBenchmarkEnabled } = flagsHooks.useFlag<
    boolean | undefined
  >(FlagId.FINOPS_BENCHMARK_ENABLED);

  return isFinOpsBenchmarkEnabled ?? false;
};
