import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWorkflowBase = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
});

export type BenchmarkWorkflowBase = Static<typeof BenchmarkWorkflowBase>;

export const CreateBenchmarkResponse = Type.Object({
  benchmarkId: Type.String(),
  folderId: Type.String(),
  workflows: Type.Array(BenchmarkWorkflowBase),
});

export type CreateBenchmarkResponse = Static<typeof CreateBenchmarkResponse>;
