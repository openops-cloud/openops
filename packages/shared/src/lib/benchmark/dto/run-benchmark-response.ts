import { Static, Type } from '@sinclair/typebox';

export const RunBenchmarkResponse = Type.Object({
  orchestratorRunId: Type.String(),
});

export type RunBenchmarkResponse = Static<typeof RunBenchmarkResponse>;
