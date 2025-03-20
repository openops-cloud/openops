import { Static, Type } from '@sinclair/typebox';
import { AppConnectionWithoutSensitiveData } from '../app-connection/app-connection';
import { Nullable } from '../common';
import {
  BlockActionSchema,
  BranchActionSchema,
  CodeActionSchema,
  LoopOnItemsActionSchema,
  SplitActionSchema,
} from './actions/action';
import { FlowStatus } from './flow';
import { BlockTrigger, EmptyTrigger, Trigger } from './triggers/trigger';

export enum FlowOperationType {
  LOCK_AND_PUBLISH = 'LOCK_AND_PUBLISH',
  CHANGE_STATUS = 'CHANGE_STATUS',
  LOCK_FLOW = 'LOCK_FLOW',
  CHANGE_FOLDER = 'CHANGE_FOLDER',
  CHANGE_NAME = 'CHANGE_NAME',
  MOVE_ACTION = 'MOVE_ACTION',
  IMPORT_FLOW = 'IMPORT_FLOW',
  UPDATE_TRIGGER = 'UPDATE_TRIGGER',
  ADD_ACTION = 'ADD_ACTION',
  UPDATE_ACTION = 'UPDATE_ACTION',
  DELETE_ACTION = 'DELETE_ACTION',
  DUPLICATE_ACTION = 'DUPLICATE_ACTION',
  USE_AS_DRAFT = 'USE_AS_DRAFT',
  CHANGE_DESCRIPTION = 'CHANGE_DESCRIPTION',
  REMOVE_CONNECTIONS = 'REMOVE_CONNECTIONS',
  PASTE_ACTIONS = 'PASTE_ACTIONS',
}

export enum StepLocationRelativeToParent {
  INSIDE_TRUE_BRANCH = 'INSIDE_TRUE_BRANCH',
  INSIDE_FALSE_BRANCH = 'INSIDE_FALSE_BRANCH',
  AFTER = 'AFTER',
  INSIDE_LOOP = 'INSIDE_LOOP',
  INSIDE_SPLIT = 'INSIDE_SPLIT',
}

export const UseAsDraftRequest = Type.Object({
  versionId: Type.String(),
});
export type UseAsDraftRequest = Static<typeof UseAsDraftRequest>;

export const LockFlowRequest = Type.Object({});

export type LockFlowRequest = Static<typeof LockFlowRequest>;

export const ImportFlowRequest = Type.Object({
  displayName: Type.String({}),
  description: Type.Optional(Type.String({})),
  trigger: Trigger,
  connections: Type.Optional(Type.Array(AppConnectionWithoutSensitiveData)),
});

export type ImportFlowRequest = Static<typeof ImportFlowRequest>;

export const ChangeFolderRequest = Type.Object({
  folderId: Nullable(Type.String({})),
});

export type ChangeFolderRequest = Static<typeof ChangeFolderRequest>;

export const ChangeNameRequest = Type.Object({
  displayName: Type.String({}),
});

export type ChangeNameRequest = Static<typeof ChangeNameRequest>;

export const DeleteActionRequest = Type.Object({
  name: Type.String(),
});

export type DeleteActionRequest = Static<typeof DeleteActionRequest>;

export const UpdateActionRequest = Type.Union([
  CodeActionSchema,
  LoopOnItemsActionSchema,
  BlockActionSchema,
  BranchActionSchema,
  SplitActionSchema,
]);
export type UpdateActionRequest = Static<typeof UpdateActionRequest>;

export const DuplicateStepRequest = Type.Object({
  stepName: Type.String(),
});

export type DuplicateStepRequest = Static<typeof DuplicateStepRequest>;

export const MoveActionRequest = Type.Object({
  name: Type.String(),
  newParentStep: Type.String(),
  branchNodeId: Type.Optional(Type.String({})), // used to identify node location relative to parent (example in Split)
  stepLocationRelativeToNewParent: Type.Optional(
    Type.Enum(StepLocationRelativeToParent),
  ),
});
export type MoveActionRequest = Static<typeof MoveActionRequest>;

export const AddActionRequest = Type.Object({
  parentStep: Type.String(),
  stepLocationRelativeToParent: Type.Optional(
    Type.Enum(StepLocationRelativeToParent),
  ),
  branchNodeId: Type.Optional(Type.String({})), // used to identify node location relative to parent (example in Split)
  action: UpdateActionRequest,
});
export type AddActionRequest = Static<typeof AddActionRequest>;

export const UpdateTriggerRequest = Type.Union([EmptyTrigger, BlockTrigger]);
export type UpdateTriggerRequest = Static<typeof UpdateTriggerRequest>;

export const UpdateFlowStatusRequest = Type.Object({
  status: Type.Enum(FlowStatus),
});
export type UpdateFlowStatusRequest = Static<typeof UpdateFlowStatusRequest>;

export const ChangePublishedVersionIdRequest = Type.Object({});
export type ChangePublishedVersionIdRequest = Static<
  typeof ChangePublishedVersionIdRequest
>;

export const ChangeDescriptionRequest = Type.Object({
  description: Type.String({}),
});

export type ChangeDescriptionRequest = Static<typeof ChangeDescriptionRequest>;

export const PasteActionsRequest = Type.Object({
  action: Type.Any(),
  parentStep: Type.String(),
  stepLocationRelativeToParent: Type.Enum(StepLocationRelativeToParent),
  branchNodeId: Type.Optional(Type.String({})),
});

export type PasteActionsRequest = Static<typeof PasteActionsRequest>;

export const FlowOperationRequest = Type.Union([
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.MOVE_ACTION),
      request: MoveActionRequest,
    },
    {
      title: 'Move Action',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.CHANGE_STATUS),
      request: UpdateFlowStatusRequest,
    },
    {
      title: 'Change Status',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.LOCK_AND_PUBLISH),
      request: ChangePublishedVersionIdRequest,
    },
    {
      title: 'Lock and Publish',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.USE_AS_DRAFT),
      request: UseAsDraftRequest,
    },
    {
      title: 'Copy as Draft',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.LOCK_FLOW),
      request: LockFlowRequest,
    },
    {
      title: 'Lock Flow',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.IMPORT_FLOW),
      request: ImportFlowRequest,
    },
    {
      title: 'Import Flow',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.CHANGE_NAME),
      request: ChangeNameRequest,
    },
    {
      title: 'Change Name',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.DELETE_ACTION),
      request: DeleteActionRequest,
    },
    {
      title: 'Delete Action',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.UPDATE_ACTION),
      request: UpdateActionRequest,
    },
    {
      title: 'Update Action',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.ADD_ACTION),
      request: AddActionRequest,
    },
    {
      title: 'Add Action',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.UPDATE_TRIGGER),
      request: UpdateTriggerRequest,
    },
    {
      title: 'Update Trigger',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.CHANGE_FOLDER),
      request: ChangeFolderRequest,
    },
    {
      title: 'Change Folder',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.DUPLICATE_ACTION),
      request: DuplicateStepRequest,
    },
    {
      title: 'Duplicate Action',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.CHANGE_DESCRIPTION),
      request: ChangeDescriptionRequest,
    },
    {
      title: 'Change Description',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.REMOVE_CONNECTIONS),
      request: Type.Null(),
    },
    {
      title: 'Remove Connections',
    },
  ),
  Type.Object(
    {
      type: Type.Literal(FlowOperationType.PASTE_ACTIONS),
      request: PasteActionsRequest,
    },
    {
      title: 'Paste Actions',
    },
  ),
]);

export type FlowOperationRequest = Static<typeof FlowOperationRequest>;

export const UpdateFlowVersionRequest = Type.Object({
  updateTimestamp: Type.String(),
  trigger: Trigger,
  valid: Type.Boolean(),
  flowId: Type.String(),
});

export type UpdateFlowVersionRequest = Static<typeof UpdateFlowVersionRequest>;
