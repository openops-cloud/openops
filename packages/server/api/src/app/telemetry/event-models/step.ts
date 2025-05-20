import { telemetry } from '../telemetry';

export type StepBase = {
  projectId: string;
  userId: string;
  stepName: string;
};
export enum StepEventName {
  STEP_FAILURE = 'step_failure',
}

export function sendStepFailureEvent(
  params: StepBase & { errorMessage: string },
): void {
  telemetry.trackEvent({
    name: StepEventName.STEP_FAILURE,
    labels: {
      userId: params.userId,
      projectId: params.projectId,
      stepName: params.stepName,
      errorMessage: params.errorMessage,
    },
  });
}
