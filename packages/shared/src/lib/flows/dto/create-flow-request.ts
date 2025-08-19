import { Static, Type } from '@sinclair/typebox';
import { FlowType } from '../flow-version';
import { Trigger } from '../triggers/trigger';

export const CreateEmptyFlowRequest = Type.Object({
  displayName: Type.String({}),
  folderId: Type.Optional(Type.String({})),
  type: Type.Optional(Type.Enum(FlowType)),
});

export type CreateEmptyFlowRequest = Static<typeof CreateEmptyFlowRequest>;

export const CreateFlowFromTemplateRequest = Type.Object({
  template: Type.Object({
    id: Type.String({}),
    isSample: Type.Boolean({}),
    displayName: Type.String({}),
    description: Type.Optional(Type.String({})),
    trigger: Type.Omit(Trigger, ['id']),
  }),
  connectionIds: Type.Array(Type.String({})),
});

export type CreateFlowFromTemplateRequest = Static<
  typeof CreateFlowFromTemplateRequest
>;
