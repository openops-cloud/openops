import { Static, Type } from '@sinclair/typebox';
import { BenchmarkWorkflowBase } from './create-benchmark-response';

export const BenchmarkStatus = Type.Union([
  Type.Literal('idle'),
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
]);

export type BenchmarkStatus = Static<typeof BenchmarkStatus>;

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
  assessmentId: Type.String(),
  status: BenchmarkStatus,
  workflows: Type.Array(BenchmarkWorkflowStatusItem),
  lastRunId: Type.Optional(Type.String()),
  lastRunFinishedAt: Type.Optional(Type.String()),
});

export type BenchmarkStatusResponse = Static<typeof BenchmarkStatusResponse>;
