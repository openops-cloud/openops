import { Static, Type } from '@sinclair/typebox';
import { Trigger } from '../triggers/trigger';

export const CreateEmptyFlowRequest = Type.Object({
  displayName: Type.String({}),
  folderId: Type.Optional(Type.String({})),
});

export type CreateEmptyFlowRequest = Static<typeof CreateEmptyFlowRequest>;

export const CreateFlowFromTemplateRequest = Type.Object({
  template: Type.Object({
    id: Type.String({}),
    isSample: Type.Boolean({}),
    displayName: Type.String({}),
    description: Type.Optional(Type.String({})),
    trigger: Trigger,
  }),
  connectionIds: Type.Array(Type.String({})),
});

export type CreateFlowFromTemplateRequest = Static<
  typeof CreateFlowFromTemplateRequest
>;
