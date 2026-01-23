import { logger, wasWorkflowDeletionRequested } from '@openops/server-shared';
import { FlowId } from '@openops/shared';

const defaultMessage =
  'Workflow deletion was requested. Stopping workflow executions.';

export class WorkflowDeletionRequestedError extends Error {
  constructor(message = defaultMessage) {
    super(message);
    this.name = 'WorkflowDeletionRequestedError';
  }
}

export async function throwIfWorkflowDeletionRequested(
  flowId: FlowId,
): Promise<void> {
  const wasDeletionRequested = await wasWorkflowDeletionRequested(flowId);

  if (wasDeletionRequested) {
    logger.info(defaultMessage);
    throw new WorkflowDeletionRequestedError();
  }
}
