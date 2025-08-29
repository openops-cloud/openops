import {
  logger,
  wasWorkflowCancellationRequested,
} from '@openops/server-shared';
import { FlowRunId } from '@openops/shared';
import { progressService } from './services/progress.service';
import { ExecutionVerdict } from './handler/context/flow-execution-context';

const defaultMessage = 'Workflow execution has been aborted.';

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
