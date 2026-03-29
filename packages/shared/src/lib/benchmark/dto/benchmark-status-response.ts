import { Static, Type } from '@sinclair/typebox';
import { SimplifiedRunStatus } from '../../common/run-status';
import { BenchmarkWorkflowBase } from './create-benchmark-response';

export const BenchmarkWorkflowStatusItem = Type.Intersect([
  BenchmarkWorkflowBase,
  Type.Object({
    runStatus: Type.Enum(SimplifiedRunStatus),
    runId: Type.Optional(Type.String()),
  }),
]);

export type BenchmarkWorkflowStatusItem = Static<
  typeof BenchmarkWorkflowStatusItem
>;

export const BenchmarkStatusResponse = Type.Object({
  benchmarkId: Type.String(),
  status: Type.Enum(SimplifiedRunStatus),
  workflows: Type.Array(BenchmarkWorkflowStatusItem),
  lastRunId: Type.Optional(Type.String()),
  lastRunFinishedAt: Type.Optional(Type.String()),
});

export type BenchmarkStatusResponse = Static<typeof BenchmarkStatusResponse>;
