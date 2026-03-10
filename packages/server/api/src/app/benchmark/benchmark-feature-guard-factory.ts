import {
  benchmarkFeatureGuard,
  BenchmarkFeatureGuard,
} from './benchmark-feature-guard';

export const getBenchmarkFeatureGuard = (): BenchmarkFeatureGuard => {
  return benchmarkFeatureGuard;
};
