export const TOOL_STATUS_TYPES = {
  RUNNING: 'running',
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
} as const;

export type ToolStatusType =
  (typeof TOOL_STATUS_TYPES)[keyof typeof TOOL_STATUS_TYPES];

export const toolStatusUtils = {
  isRunning: (status?: { type: string }) =>
    status?.type === TOOL_STATUS_TYPES.RUNNING,
  isComplete: (status?: { type: string }) =>
    status?.type === TOOL_STATUS_TYPES.COMPLETE,
  isIncomplete: (status?: { type: string }) =>
    status?.type === TOOL_STATUS_TYPES.INCOMPLETE,
};
