import { Static, Type } from '@sinclair/typebox';
import { Nullable } from '../common';
import { FlowRunResponse } from '../flow-run/execution/flow-execution';
import { EngineHttpResponse } from './engine-operation';
import { ProgressUpdateType } from './types';

export const UpdateRunProgressRequest = Type.Object({
  executionCorrelationId: Type.String(),
  runDetails: FlowRunResponse,
  runId: Type.String(),
  progressUpdateType: Type.Optional(Type.Enum(ProgressUpdateType)),
  workerHandlerId: Nullable(Type.String()),
  flowId: Type.String(),
});

export type UpdateRunProgressRequest = Static<typeof UpdateRunProgressRequest>;

export const SendWebhookResponseRequest = Type.Object({
  flowRunId: Type.String(),
  workerHandlerId: Type.String(),
  response: EngineHttpResponse,
});

export type SendWebhookResponseRequest = Static<
  typeof SendWebhookResponseRequest
>;

export const RemoveStableJobEngineRequest = Type.Object({
  flowId: Type.Optional(Type.String()),
  flowVersionId: Type.String(),
});
export type RemoveStableJobEngineRequest = Static<
  typeof RemoveStableJobEngineRequest
>;
export enum GetFlowVersionForWorkerRequestType {
  LATEST = 'LATEST',
  LOCKED = 'LOCKED',
  EXACT = 'EXACT',
}

export const GetFlowVersionForWorkerRequest = Type.Union([
  Type.Object({
    type: Type.Literal(GetFlowVersionForWorkerRequestType.LATEST),
    flowId: Type.String(),
  }),
  Type.Object({
    type: Type.Literal(GetFlowVersionForWorkerRequestType.LOCKED),
    flowId: Type.String(),
  }),
  Type.Object({
    type: Type.Literal(GetFlowVersionForWorkerRequestType.EXACT),
    versionId: Type.String(),
  }),
]);

export type GetFlowVersionForWorkerRequest = Static<
  typeof GetFlowVersionForWorkerRequest
>;
