import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema, Nullable } from '../common/base-model';
import { OpenOpsId } from '../common/id-generator';
import { TestRunLimitSettings } from '../flow-run/test-run-settings';
import { User } from '../user';
import { Trigger } from './triggers/trigger';

export type FlowVersionId = OpenOpsId;

export enum FlowVersionState {
  LOCKED = 'LOCKED',
  DRAFT = 'DRAFT',
}

export const FlowVersion = Type.Object({
  ...BaseModelSchema,
  flowId: Type.String(),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
  trigger: Trigger,
  updatedBy: Nullable(Type.String()),
  valid: Type.Boolean(),
  state: Type.Enum(FlowVersionState),
  testRunActionLimits: TestRunLimitSettings,
});

export type FlowVersion = Static<typeof FlowVersion>;

export const FlowVersionMetadata = Type.Object({
  ...BaseModelSchema,
  flowId: Type.String(),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
  valid: Type.Boolean(),
  state: Type.Enum(FlowVersionState),
  updatedBy: Nullable(Type.String()),
  updatedByUser: Nullable(User),
});

export type FlowVersionMetadata = Static<typeof FlowVersionMetadata>;
