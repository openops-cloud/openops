import { Static, Type } from '@sinclair/typebox';
import { OpenOpsId } from '../../common/id-generator';
import { FlowRunStatus } from '../execution/flow-execution';
import { FlowRunTriggerSource } from '../flow-run';

export const ListFlowRunsRequestQuery = Type.Object({
  flowId: Type.Optional(Type.Array(OpenOpsId)),
  tags: Type.Optional(Type.Array(Type.String({}))),
  status: Type.Optional(Type.Array(Type.Enum(FlowRunStatus))),
  triggerSource: Type.Optional(Type.Array(Type.Enum(FlowRunTriggerSource))),
  limit: Type.Optional(Type.Number({})),
  cursor: Type.Optional(Type.String({})),
  createdAfter: Type.Optional(Type.String({})),
  createdBefore: Type.Optional(Type.String({})),
});

export type ListFlowRunsRequestQuery = Static<typeof ListFlowRunsRequestQuery>;
