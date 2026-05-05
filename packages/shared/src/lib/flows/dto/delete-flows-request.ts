import { Static, Type } from '@sinclair/typebox';
import { OpenOpsId } from '../../common/id-generator';

export const DeleteFlowsRequest = Type.Object({
  flowIds: Type.Array(OpenOpsId, {
    minItems: 1,
  }),
});

export type DeleteFlowsRequest = Static<typeof DeleteFlowsRequest>;
