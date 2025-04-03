import { getContext, logger } from '@openops/server-shared';

export function throwIfExecutionTimeExceeded(): void {
  const deadlineTimestamp = getContext()['deadlineTimestamp'];
  if (deadlineTimestamp && Date.now() > Number(deadlineTimestamp)) {
    logger.error('Engine execution time exceeded.');
    throw new Error('Engine execution time exceeded.');
  }
}
