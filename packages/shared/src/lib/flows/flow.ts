import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';
import { FlowVersion, FlowVersionState } from './flow-version';

export type FlowId = OpenOpsId;

export enum ScheduleType {
  CRON_EXPRESSION = 'CRON_EXPRESSION',
}

export enum FlowStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export const FlowScheduleOptions = Type.Object({
  type: Type.Literal(ScheduleType.CRON_EXPRESSION),
  cronExpression: Type.String(),
  timezone: Type.String(),
  failureCount: Type.Optional(Type.Number()),
});

export type FlowScheduleOptions = Static<typeof FlowScheduleOptions>;

export const Flow = Type.Object({
  ...BaseModelSchema,
  projectId: Type.String(),
  folderId: Nullable(Type.String()),
  status: Type.Enum(FlowStatus),
  schedule: Nullable(FlowScheduleOptions),
  publishedVersionId: Nullable(Type.String()),
});

export type Flow = Static<typeof Flow>;

export const PopulatedFlow = Type.Composite([
  Flow,
  Type.Object({
    version: FlowVersion,
  }),
]);

export type PopulatedFlow = Static<typeof PopulatedFlow>;

export const MinimalFlow = Type.Object({
  id: Type.String(),
  displayName: Type.String(),
});

export type MinimalFlow = Static<typeof MinimalFlow>;

export const FlowSummary = Type.Object({
  id: Type.String(),
  status: Type.Enum(FlowStatus),
  schedule: Nullable(FlowScheduleOptions),
  publishedVersionId: Nullable(Type.String()),
  created: Type.String(),
  updated: Type.String(),
  version: Type.Object({
    id: Type.String(),
    displayName: Type.String(),
    description: Type.Optional(Type.String()),
    state: Type.Enum(FlowVersionState),
    created: Type.String(),
    updated: Type.String(),
    updatedBy: Nullable(Type.String()),
  }),
});

export type FlowSummary = Static<typeof FlowSummary>;
