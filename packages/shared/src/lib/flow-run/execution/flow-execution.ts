import { Static, Type } from '@sinclair/typebox';
import { ProgressUpdateType } from '../../engine/types';

export enum FlowRunStatus {
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
  SCHEDULED = 'SCHEDULED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PAUSED = 'PAUSED',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  SUCCEEDED = 'SUCCEEDED',
  TIMEOUT = 'TIMEOUT',
}

export const PauseMetadata = Type.Object({
  resumeDateTime: Type.Optional(Type.String()),
  handlerId: Type.Optional(Type.String({})),
  progressUpdateType: Type.Optional(Type.Enum(ProgressUpdateType)),
  executionCorrelationId: Type.Optional(Type.String()),
  response: Type.Optional(Type.Unknown()),
  path: Type.Optional(Type.String()),
});

export type PauseMetadata = Static<typeof PauseMetadata>;

export const StopResponse = Type.Object({
  status: Type.Optional(Type.Number()),
  body: Type.Optional(Type.Unknown()),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
});

export type StopResponse = Static<typeof StopResponse>;

export const FlowError = Type.Object({
  stepName: Type.String(),
  message: Type.String(),
});

export type FlowError = Static<typeof FlowError>;

const BaseExecutionResponse = {
  steps: Type.Record(Type.String(), Type.Unknown()),
  duration: Type.Number(),
  tasks: Type.Number(),
  tags: Type.Optional(Type.Array(Type.String())),
  error: Type.Optional(FlowError),
  stopResponse: Type.Optional(StopResponse),
};

export const FlowRunResponse = Type.Union([
  Type.Object({
    ...BaseExecutionResponse,
    status: Type.Literal(FlowRunStatus.PAUSED),
    pauseMetadata: Type.Optional(PauseMetadata),
  }),
  Type.Object({
    ...BaseExecutionResponse,
    status: Type.Union([
      Type.Literal(FlowRunStatus.FAILED),
      Type.Literal(FlowRunStatus.SUCCEEDED),
      Type.Literal(FlowRunStatus.RUNNING),
      Type.Literal(FlowRunStatus.TIMEOUT),
      Type.Literal(FlowRunStatus.INTERNAL_ERROR),
      Type.Literal(FlowRunStatus.STOPPED),
    ]),
  }),
]);
export type FlowRunResponse = Static<typeof FlowRunResponse>;

export const TERMINAL_STATUSES = Object.freeze<FlowRunStatus[]>([
  FlowRunStatus.SUCCEEDED,
  FlowRunStatus.STOPPED,
  FlowRunStatus.TIMEOUT,
  FlowRunStatus.FAILED,
  FlowRunStatus.INTERNAL_ERROR,
]);

export const isFlowStateTerminal = (s: FlowRunStatus): boolean =>
  TERMINAL_STATUSES.includes(s);

export const isFailedState = (status: FlowRunStatus): boolean => {
  return (
    status === FlowRunStatus.FAILED ||
    status === FlowRunStatus.INTERNAL_ERROR ||
    status === FlowRunStatus.TIMEOUT
  );
};
