import { Static, Type } from '@sinclair/typebox';

export const CreateBenchmarkRequest = Type.Object({
  answers: Type.Record(Type.String(), Type.Array(Type.String())),
});

export type CreateBenchmarkRequest = Static<typeof CreateBenchmarkRequest>;
