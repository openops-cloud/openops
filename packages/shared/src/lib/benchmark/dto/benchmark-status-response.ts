import { Static, Type } from '@sinclair/typebox';

export const BenchmarkStatusEnum = Type.Union([
  Type.Literal('idle'),
  Type.Literal('running'),
  Type.Literal('completed'),
  Type.Literal('failed'),
]);

export type BenchmarkStatus = Static<typeof BenchmarkStatusEnum>;

export const BenchmarkWorkflowStatusItem = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
  runStatus: Type.String(),
  runId: Type.Optional(Type.String()),
});

export type BenchmarkWorkflowStatusItem = Static<
  typeof BenchmarkWorkflowStatusItem
>;

export const BenchmarkStatusResponse = Type.Object({
  assessmentId: Type.String(),
  status: BenchmarkStatusEnum,
  workflows: Type.Array(BenchmarkWorkflowStatusItem),
  lastRunId: Type.Optional(Type.String()),
  lastRunFinishedAt: Type.Optional(Type.String()),
});

export type BenchmarkStatusResponse = Static<typeof BenchmarkStatusResponse>;
