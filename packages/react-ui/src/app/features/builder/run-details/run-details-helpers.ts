import { FlowRun, FlowRunStatus, isNil } from '@openops/shared';
import { t } from 'i18next';

const ACTION_LIMIT_REACHED_MESSAGE = 'Action limit reached';

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
  if (run.status === FlowRunStatus.INTERNAL_ERROR && isNil(run.logsFileId)) {
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

export function getStatusText(
  status: FlowRunStatus,
  timeout: number,
  terminationReason?: string,
): string {
  switch (status) {
    case FlowRunStatus.STOPPED:
      if (terminationReason?.startsWith(ACTION_LIMIT_REACHED_MESSAGE)) {
        return t('Run Stopped due to Action Limits');
      }
      return t('Workflow Run was stopped');
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
