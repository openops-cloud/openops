import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';
import { FlowType, FlowVersion, FlowVersionState } from './flow-version';

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
  type: Type.Enum(FlowType),
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
  status: Type.Enum(FlowStatus, {
    description:
      'Runtime status of the flow. ENABLED: active and will execute based on the trigger. DISABLED: the flow can only be executed in manual test mode.',
  }),
  schedule: Nullable(FlowScheduleOptions),
  publishedVersionId: Nullable(Type.String()),
  created: Type.String(),
  updated: Type.String(),
  version: Type.Object(
    {
      id: Type.String(),
      displayName: Type.String(),
      description: Type.Optional(
        Type.String({
          description: 'An optional human readable description of the flow.',
        }),
      ),
      state: Type.Enum(FlowVersionState, {
        description:
          'Version state. LOCKED: published/immutable this version is used to run the flow if the flow is ENABLED. DRAFT: editable working copy, not published.',
      }),
      created: Type.String(),
      updated: Type.String(),
      updatedBy: Nullable(Type.String()),
    },
    {
      description: 'Latest version of the flow.',
    },
  ),
});

export type FlowSummary = Static<typeof FlowSummary>;
