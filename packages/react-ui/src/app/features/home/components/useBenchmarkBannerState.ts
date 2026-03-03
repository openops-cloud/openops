import { QueryKeys } from '@/app/constants/query-keys';
import { BenchmarkProvider, BenchmarkStatus } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';
import { benchmarkApi } from '../../benchmark/benchmark-api';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

type BenchmarkBannerState = {
  isEnabled: boolean;
  variation: 'default' | 'report';
  provider?: BenchmarkProvider;
};

export const useBenchmarkBannerState = (): BenchmarkBannerState => {
  const isEnabled = useShowBenchmarkBanner();

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
