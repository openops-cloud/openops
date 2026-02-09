import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWorkflowItem = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
});

export type BenchmarkWorkflowItem = Static<typeof BenchmarkWorkflowItem>;

export const CreateBenchmarkResponse = Type.Object({
  assessmentId: Type.String(),
  folderId: Type.String(),
  workflows: Type.Array(BenchmarkWorkflowItem),
  webhookPayload: Type.Object({
    data: Type.Record(Type.String(), Type.Unknown()),
  }),
});

export type CreateBenchmarkResponse = Static<typeof CreateBenchmarkResponse>;
