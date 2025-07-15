import {
  ActionType,
  flowHelper,
  FlowRun,
  FlowRunStatus,
  FlowVersion,
  isNil,
} from '@openops/shared';
import { t } from 'i18next';

/**
 * Extracts the list of executed step names from a flow run and flow version.
 *
 * @param run - The flow run containing execution data
 * @param flowVersion - The flow version containing the flow definition
 * @returns Array of step names that have been executed in the definition order
 */
export function getExecutedStepsInDefinitionOrder(
  run: FlowRun | null,
  flowVersion: FlowVersion,
): string[] {
  const executedSteps = run && run.steps ? Object.keys(run.steps) : [];

  const definitionOrder = flowVersion.trigger
    ? flowHelper.getAllSteps(flowVersion.trigger).map((step) => step.name)
    : [];

  return definitionOrder.filter((stepName) => executedSteps.includes(stepName));
}

/**
 * Gets child steps of a specific step in definition order.
 * This is useful for loop iterations and other nested step structures.
 *
 * @param stepName - The name of the parent step
 * @param flowVersion - The flow version containing the flow definition
 * @returns Array of child step names in definition order
 */
export function getChildStepsInDefinitionOrder(
  stepName: string,
  flowVersion: FlowVersion,
): string[] {
  const step = flowHelper.getStep(flowVersion, stepName);
  if (!step) return [];

  if (step.type === ActionType.LOOP_ON_ITEMS) {
    if (step.firstLoopAction) {
      return flowHelper
        .getAllSteps(step.firstLoopAction)
        .map((childStep) => childStep.name);
    }
    return [];
  }

  if (step.type === ActionType.BRANCH) {
    const allChildSteps: string[] = [];

    if (step.onSuccessAction) {
      allChildSteps.push(
        ...flowHelper.getAllSteps(step.onSuccessAction).map((s) => s.name),
      );
    }

    if (step.onFailureAction) {
      allChildSteps.push(
        ...flowHelper.getAllSteps(step.onFailureAction).map((s) => s.name),
      );
    }

    return allChildSteps;
  }

  if (step.type === ActionType.SPLIT) {
    const allChildSteps: string[] = [];

    step.branches?.forEach((branch) => {
      if (branch.nextAction) {
        allChildSteps.push(
          ...flowHelper.getAllSteps(branch.nextAction).map((s) => s.name),
        );
      }
    });

    return allChildSteps;
  }

  return [];
}

export function getRunMessage(
  run: FlowRun | null,
  retentionDays: number | null,
): string | null {
  if (
    !run ||
    run.status === FlowRunStatus.RUNNING ||
    run.status === FlowRunStatus.SCHEDULED
  )
    return null;
  if (run.status === FlowRunStatus.INTERNAL_ERROR) {
    return t('There are no logs captured for this run.');
  }
  if (isNil(run.logsFileId)) {
    return t(
      'Logs are kept for {days} days after execution and then deleted.',
      { days: retentionDays },
    );
  }
  return null;
}

export function getStatusText(status: FlowRunStatus, timeout: number): string {
  switch (status) {
    case FlowRunStatus.STOPPED:
    case FlowRunStatus.SUCCEEDED:
      return t('Run Succeeded');
    case FlowRunStatus.FAILED:
      return t('Run Failed');
    case FlowRunStatus.PAUSED:
      return t('Workflow Run is paused');
    case FlowRunStatus.RUNNING:
      return t('Running');
    case FlowRunStatus.TIMEOUT:
      return t('Run exceeded {timeout} seconds, try to optimize your steps.', {
        timeout,
      });
    case FlowRunStatus.INTERNAL_ERROR:
      return t('Run failed for an unknown reason, contact support.');
    default:
      return t('Unknown status');
  }
}
