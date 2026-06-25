import { Static, Type } from '@sinclair/typebox';
import { Nullable } from '../../common';
import { OpenOpsId } from '../../common/id-generator';

export const MoveFlowsRequest = Type.Object({
  flowIds: Type.Array(OpenOpsId, {
    minItems: 1,
  }),
  folderId: Nullable(OpenOpsId),
});

export type MoveFlowsRequest = Static<typeof MoveFlowsRequest>;
