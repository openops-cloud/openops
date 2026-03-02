import { Static, Type } from '@sinclair/typebox';
import { FlowRunStatus } from '../../flow-run/execution/flow-execution';
import { BenchmarkWorkflowBase } from './create-benchmark-response';

export enum BenchmarkStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export const BenchmarkWorkflowStatusItem = Type.Intersect([
  BenchmarkWorkflowBase,
  Type.Object({
    runStatus: Type.Union([
      Type.Enum(FlowRunStatus),
      Type.Literal(BenchmarkStatus.IDLE),
    ]),
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
  lastRunId: Type.Optional(Type.String()),
  lastRunFinishedAt: Type.Optional(Type.String()),
});

export type BenchmarkStatusResponse = Static<typeof BenchmarkStatusResponse>;
