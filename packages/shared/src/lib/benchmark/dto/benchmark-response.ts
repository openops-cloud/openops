import { Static, Type } from '@sinclair/typebox';

export const BenchmarkResponse = Type.Object({
  id: Type.String(),
  provider: Type.String(),
  lastRunId: Type.Union([Type.String(), Type.Null()]),
});

export type BenchmarkResponse = Static<typeof BenchmarkResponse>;
