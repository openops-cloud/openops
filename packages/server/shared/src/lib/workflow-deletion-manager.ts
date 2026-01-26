import { FlowId } from '@openops/shared';
import { cacheWrapper } from './cache/cache-wrapper';

const DELETED_PREFIX = 'workflow:deleted:';

function buildCancellationKey(flowId: FlowId): string {
  return `${DELETED_PREFIX}${flowId}`;
}

export async function signalWorkflowDeletion(flowId: FlowId): Promise<void> {
  const key = buildCancellationKey(flowId);
  await cacheWrapper.setKey(key, 'true');
}

export async function wasWorkflowDeletionRequested(
  flowId: FlowId,
): Promise<boolean> {
  const key = buildCancellationKey(flowId);
  const value: string | null = await cacheWrapper.getKey(key);
  if (value === null) {
    return false;
  }

  return value === 'true';
}
