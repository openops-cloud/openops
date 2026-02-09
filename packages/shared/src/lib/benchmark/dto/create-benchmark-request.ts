import { Static, Type } from '@sinclair/typebox';

export const BenchmarkConfiguration = Type.Object({
  answers: Type.Record(Type.String(), Type.Array(Type.String())),
});

export type BenchmarkConfiguration = Static<typeof BenchmarkConfiguration>;
