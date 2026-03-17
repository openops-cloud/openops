import { QueryKeys } from '@/app/constants/query-keys';
import { BenchmarkProviders, BenchmarkStatus } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { benchmarkApi } from '../../benchmark/benchmark-api';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

type BenchmarkBannerState = {
  isEnabled: boolean;
  variation: 'default' | 'report';
  provider?: BenchmarkProviders;
};

export const useBenchmarkBannerState = (): BenchmarkBannerState => {
  const { showBanner: isEnabled } = useShowBenchmarkBanner();

  const { data: benchmarks } = useQuery({
    queryKey: [QueryKeys.benchmarks],
    queryFn: () => benchmarkApi.listBenchmarks(),
    enabled: isEnabled,
  });

  const succeededBenchmark = benchmarks?.find(
    (b) => b.status === BenchmarkStatus.SUCCEEDED,
  );

  return {
    isEnabled,
    variation: succeededBenchmark ? 'report' : 'default',
    provider: succeededBenchmark?.provider,
  };
};
