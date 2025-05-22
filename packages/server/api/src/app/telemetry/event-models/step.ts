import { telemetry } from '../telemetry';

export type StepBase = {
  projectId: string;
  userId: string;
  stepName: string;
  flowVersionId: string;
  stepType: string;
  blockName: string;
  actionName: string;
};

export enum StepEventName {
  STEP_FAILURE = 'step_failure',
}

export function sendStepFailureEvent(params: StepBase): void {
  telemetry.trackEvent({
    name: StepEventName.STEP_FAILURE,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      stepName: params.stepName,
      flowVersionId: params.flowVersionId,
      actionName: params.actionName,
      blockName: params.blockName,
      stepType: params.stepType,
    },
  });
}
