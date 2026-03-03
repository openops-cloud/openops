import { Static, Type } from '@sinclair/typebox';
import { BenchmarkProviders } from '../benchmark-providers';
import { BenchmarkStatus } from './benchmark-status-response';

export const BenchmarkListItem = Type.Object({
  benchmarkId: Type.String(),
  provider: Type.Enum(BenchmarkProviders),
  status: Type.Enum(BenchmarkStatus),
});

export type BenchmarkListItem = Static<typeof BenchmarkListItem>;

export const ListBenchmarksResponse = Type.Array(BenchmarkListItem);

export type ListBenchmarksResponse = Static<typeof ListBenchmarksResponse>;
