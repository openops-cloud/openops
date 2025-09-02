import { getContext, logger } from '@openops/server-shared';

const defaultMessage = 'Engine execution time exceeded.';

export class EngineTimeoutError extends Error {
  constructor(message = defaultMessage) {
    super(message);
    this.name = 'EngineTimeoutError';
  }
}

export function throwIfExecutionTimeExceeded(): void {
  // const deadlineTimestamp = getContext()['deadlineTimestamp'];
  // if (deadlineTimestamp && Date.now() > Number(deadlineTimestamp)) {
    logger.error(defaultMessage);
    throw new EngineTimeoutError();
  // }
}
