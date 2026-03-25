import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWorkflowBase = Type.Object({
  flowId: Type.String(),
  displayName: Type.String(),
  isOrchestrator: Type.Boolean(),
  isCleanup: Type.Boolean(),
});

export type BenchmarkWorkflowBase = Static<typeof BenchmarkWorkflowBase>;

const BenchmarkWebhookPayloadBase = Type.Object({
  webhookBaseUrl: Type.String(),
  workflows: Type.Array(Type.String()),
  cleanupWorkflows: Type.Array(Type.String()),
  regions: Type.Array(Type.String()),
});

export const AwsBenchmarkWebhookPayload = Type.Intersect([
  BenchmarkWebhookPayloadBase,
  Type.Object({
    accounts: Type.Array(Type.String()),
  }),
]);

export type AwsBenchmarkWebhookPayload = Static<
  typeof AwsBenchmarkWebhookPayload
>;

export const AzureBenchmarkWebhookPayload = Type.Intersect([
  BenchmarkWebhookPayloadBase,
  Type.Object({
    subscriptions: Type.Array(Type.String()),
  }),
]);

export type AzureBenchmarkWebhookPayload = Static<
  typeof AzureBenchmarkWebhookPayload
>;

export const BenchmarkWebhookPayload = Type.Union([
  AwsBenchmarkWebhookPayload,
  AzureBenchmarkWebhookPayload,
]);

export type BenchmarkWebhookPayload = Static<typeof BenchmarkWebhookPayload>;

export const BenchmarkCreationResult = Type.Object({
  benchmarkId: Type.String(),
  folderId: Type.String(),
  provider: Type.String(),
  workflows: Type.Array(BenchmarkWorkflowBase),
  webhookPayload: BenchmarkWebhookPayload,
});

export type BenchmarkCreationResult = Static<typeof BenchmarkCreationResult>;
