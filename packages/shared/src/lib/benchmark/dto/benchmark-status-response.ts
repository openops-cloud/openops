import { Static, Type } from '@sinclair/typebox';
import { BenchmarkWorkflowBase } from './create-benchmark-response';

export enum BenchmarkStatus {
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export const BenchmarkWorkflowStatusItem = Type.Intersect([
  BenchmarkWorkflowBase,
  Type.Object({
    runStatus: Type.String(),
    runId: Type.Optional(Type.String()),
  }),
]);

export type BenchmarkWorkflowStatusItem = Static<
  typeof BenchmarkWorkflowStatusItem
>;

export const BenchmarkStatusResponse = Type.Object({
  benchmarkId: Type.String(),
  status: Type.Enum(BenchmarkStatus),
  workflows: Type.Array(BenchmarkWorkflowStatusItem),
});

export type BenchmarkStatusResponse = Static<typeof BenchmarkStatusResponse>;
