import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWorkflowBase = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
});

export type BenchmarkWorkflowBase = Static<typeof BenchmarkWorkflowBase>;

export const BenchmarkWebhookPayload = Type.Object({
  workflows: Type.Array(Type.String()),
  cleanupWorkflows: Type.Array(Type.String()),
  accounts: Type.Array(Type.String()),
  regions: Type.Array(Type.String()),
});

export type BenchmarkWebhookPayload = Static<typeof BenchmarkWebhookPayload>;

export const CreateBenchmarkResponse = Type.Object({
  benchmarkId: Type.String(),
  folderId: Type.String(),
  workflows: Type.Array(BenchmarkWorkflowBase),
  webhookPayload: BenchmarkWebhookPayload,
});

export type CreateBenchmarkResponse = Static<typeof CreateBenchmarkResponse>;
