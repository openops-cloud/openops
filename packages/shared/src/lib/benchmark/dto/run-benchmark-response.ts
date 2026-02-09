import { Static, Type } from '@sinclair/typebox';

export const RunBenchmarkResponse = Type.Object({
  runId: Type.String(),
});

export type RunBenchmarkResponse = Static<typeof RunBenchmarkResponse>;
