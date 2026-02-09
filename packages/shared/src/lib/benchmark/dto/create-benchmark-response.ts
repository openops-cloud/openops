import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWorkflowBase = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
});

export type BenchmarkWorkflowBase = Static<typeof BenchmarkWorkflowBase>;

export const CreateBenchmarkResponse = Type.Object({
  assessmentId: Type.String(),
  folderId: Type.String(),
  workflows: Type.Array(BenchmarkWorkflowBase),
  webhookPayload: Type.Object({
    data: Type.Record(Type.String(), Type.Unknown()),
  }),
});

export type CreateBenchmarkResponse = Static<typeof CreateBenchmarkResponse>;
