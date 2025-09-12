export enum WebsocketClientEvent {
  TEST_FLOW_RUN_STARTED = 'TEST_FLOW_RUN_STARTED',
  FLOW_RUN_PROGRESS = 'FLOW_RUN_PROGRESS',
  TEST_STEP_FINISHED = 'TEST_STEP_FINISHED',
  REFRESH_BLOCK = 'REFRESH_BLOCK',
  WORKFLOW_STEP_ADDED = 'WORKFLOW_STEP_ADDED',
  WORKFLOW_STEP_UPDATED = 'WORKFLOW_STEP_UPDATED',
  WORKFLOW_STEP_TESTED = 'WORKFLOW_STEP_TESTED',
  TOOL_APPROVAL_RESOLVED = 'TOOL_APPROVAL_RESOLVED',
}

export enum WebsocketServerEvent {
  TEST_STEP_RUN = 'TEST_STEP_RUN',
  TEST_FLOW_RUN = 'TEST_FLOW_RUN',
}

export type WorkflowStepAddedPayload = {
  flowId: string;
  flowVersionId: string;
  newStepName: string;
  newStepId: string;
  stepLocationRelativeToParent?: string;
  parentStep?: string;
};

export type WorkflowStepUpdatedPayload = {
  flowId: string;
  flowVersionId: string;
  stepName: string;
  stepId: string;
};

export type WorkflowStepTestedPayload = {
  flowId: string;
  flowVersionId: string;
  stepName: string;
  stepId: string;
  success: boolean;
};
