import {
  logger,
  wasWorkflowCancellationRequested,
} from '@openops/server-shared';
import { FlowRunId } from '@openops/shared';

const defaultMessage = 'Workflow execution has been stopped.';

export class CancellationRequestedError extends Error {
  constructor(message = defaultMessage) {
    super(message);
    this.name = 'CancellationRequestedError';
  }
}

export async function throwIfCancellationRequested(
  flowRunId: FlowRunId,
): Promise<void> {
  const wasCancellationRequested = await wasWorkflowCancellationRequested(
    flowRunId,
  );

  if (wasCancellationRequested) {
    logger.info(defaultMessage);
    throw new CancellationRequestedError();
  }
}
