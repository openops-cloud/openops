import { Static, Type } from '@sinclair/typebox';

export const CreateBenchmarkRequest = Type.Object({
  benchmarkConfiguration: Type.Record(Type.String(), Type.Array(Type.String())),
});

export type CreateBenchmarkRequest = Static<typeof CreateBenchmarkRequest>;
