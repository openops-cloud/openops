import { Static, Type } from '@sinclair/typebox';
import { SimplifiedRunStatus } from '../../common/run-status';
import { BenchmarkProviders } from '../benchmark-providers';

export const BenchmarkListItem = Type.Object({
  benchmarkId: Type.String(),
  provider: Type.Enum(BenchmarkProviders),
  status: Type.Enum(SimplifiedRunStatus),
});

export type BenchmarkListItem = Static<typeof BenchmarkListItem>;

export const ListBenchmarksResponse = Type.Array(BenchmarkListItem);

export type ListBenchmarksResponse = Static<typeof ListBenchmarksResponse>;
