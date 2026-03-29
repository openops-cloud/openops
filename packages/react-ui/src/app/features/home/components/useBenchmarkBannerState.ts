import { QueryKeys } from '@/app/constants/query-keys';
import { BenchmarkProviders, SimplifiedRunStatus } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { benchmarkApi } from '../../benchmark/benchmark-api';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

type BenchmarkBannerState = {
  isEnabled: boolean;
  variation: 'default' | 'report';
  providers: BenchmarkProviders[];
};

export const useBenchmarkBannerState = (): BenchmarkBannerState => {
  const { showBanner: isEnabled } = useShowBenchmarkBanner();

  const { data: benchmarks } = useQuery({
    queryKey: [QueryKeys.benchmarks],
    queryFn: () => benchmarkApi.listBenchmarks(),
    enabled: isEnabled,
  });

  const succeededProviders =
    benchmarks?.reduce<BenchmarkProviders[]>((providers, benchmark) => {
      if (benchmark.status !== SimplifiedRunStatus.SUCCEEDED) {
        return providers;
      }

      if (!providers.includes(benchmark.provider)) {
        providers.push(benchmark.provider);
      }

      return providers;
    }, []) ?? [];

  return {
    isEnabled,
    variation: succeededProviders.length > 0 ? 'report' : 'default',
    providers: succeededProviders,
  };
};
