import { FlowRunId } from '@openops/shared';
import { cacheWrapper } from './cache/cache-wrapper';

const CANCELLATION_PREFIX = 'workflow:cancel:';

function buildCancellationKey(flowRunId: FlowRunId): string {
  return `${CANCELLATION_PREFIX}${flowRunId}`;
}

export async function requestWorkflowCancellation(
  flowRunId: FlowRunId,
): Promise<void> {
  const key = buildCancellationKey(flowRunId);
  await cacheWrapper.setKey(key, 'true');
}

export async function wasWorkflowCancellationRequested(
  flowRunId: FlowRunId,
): Promise<boolean> {
  const key = buildCancellationKey(flowRunId);
  const value: string | null = await cacheWrapper.getKey(key);
  if (value === null) {
    return false;
  }

  return value === 'true';
}
