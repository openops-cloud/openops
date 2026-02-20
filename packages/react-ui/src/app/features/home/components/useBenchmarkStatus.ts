import { benchmarkApi } from '@/app/features/benchmark/benchmark-api';
import { QueryKeys } from '@/app/constants/query-keys';
import { BenchmarkProviders } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

export const useBenchmarkStatus = (provider: BenchmarkProviders) => {
  const showBanner = useShowBenchmarkBanner();

  const { data } = useQuery({
    queryKey: [QueryKeys.benchmarkStatus, provider],
    queryFn: () => benchmarkApi.getBenchmark(provider).catch(() => null),
    enabled: showBanner,
    retry: false,
  });

  return {
    showBanner,
    hasRun: showBanner && data?.lastRunId != null,
  };
};
