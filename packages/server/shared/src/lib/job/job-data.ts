import { TriggerStrategy } from '@openops/blocks-framework';
import {
  ExecutionType,
  ProgressUpdateType,
  RunEnvironment,
  TriggerType,
} from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';

export const LATEST_JOB_DATA_SCHEMA_VERSION = 5;

export enum RepeatableJobType {
  RENEW_WEBHOOK = 'RENEW_WEBHOOK',
  EXECUTE_TRIGGER = 'EXECUTE_TRIGGER',
  DELAYED_FLOW = 'DELAYED_FLOW',
}

// Never change without increasing LATEST_JOB_DATA_SCHEMA_VERSION, and adding a migration
export const RenewWebhookJobData = Type.Object({
  schemaVersion: Type.Number(),
  projectId: Type.String(),
  flowVersionId: Type.String(),
  flowId: Type.String(),
  jobType: Type.Literal(RepeatableJobType.RENEW_WEBHOOK),
});
export type RenewWebhookJobData = Static<typeof RenewWebhookJobData>;

// Never change without increasing LATEST_JOB_DATA_SCHEMA_VERSION, and adding a migration
export const RepeatingJobData = Type.Object({
  projectId: Type.String(),
  environment: Type.Enum(RunEnvironment),
  schemaVersion: Type.Number(),
  flowVersionId: Type.String(),
  flowId: Type.String(),
  triggerType: Type.Enum(TriggerType),
  triggerStrategy: Type.Enum(TriggerStrategy),
  jobType: Type.Literal(RepeatableJobType.EXECUTE_TRIGGER),
});
export type RepeatingJobData = Static<typeof RepeatingJobData>;

export const ResumePayload = Type.Object({
  executionCorrelationId: Type.Optional(Type.String()),
  path: Type.Optional(Type.String()),
});

// Never change without increasing LATEST_JOB_DATA_SCHEMA_VERSION, and adding a migration
export const DelayedJobData = Type.Object({
  projectId: Type.String(),
  environment: Type.Enum(RunEnvironment),
  schemaVersion: Type.Number(),
  flowVersionId: Type.String(),
  runId: Type.String(),
  resumePayload: Type.Optional(ResumePayload),
  executionCorrelationId: Type.String(),
  synchronousHandlerId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  progressUpdateType: Type.Optional(Type.Enum(ProgressUpdateType)),
  jobType: Type.Literal(RepeatableJobType.DELAYED_FLOW),
});
export type DelayedJobData = Static<typeof DelayedJobData>;

export const ScheduledJobData = Type.Union([
  RepeatingJobData,
  DelayedJobData,
  RenewWebhookJobData,
]);
export type ScheduledJobData = Static<typeof ScheduledJobData>;

export const OneTimeJobData = Type.Object({
  projectId: Type.String(),
  environment: Type.Enum(RunEnvironment),
  flowVersionId: Type.String(),
  runId: Type.String(),
  synchronousHandlerId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  executionCorrelationId: Type.String(),
  payload: Type.Any(),
  executionType: Type.Enum(ExecutionType),
  retryPayload: Type.Optional(Type.Any()),
  progressUpdateType: Type.Enum(ProgressUpdateType),
});
export type OneTimeJobData = Static<typeof OneTimeJobData>;

export const WebhookJobData = Type.Object({
  projectId: Type.String(),
  schemaVersion: Type.Number(),
  executionCorrelationId: Type.String(),
  synchronousHandlerId: Type.Union([Type.String(), Type.Null()]),
  payload: Type.Any(),
  flowId: Type.String(),
  simulate: Type.Boolean(),
});
export type WebhookJobData = Static<typeof WebhookJobData>;

export const JobData = Type.Union([
  ScheduledJobData,
  OneTimeJobData,
  WebhookJobData,
]);
export type JobData = Static<typeof JobData>;
