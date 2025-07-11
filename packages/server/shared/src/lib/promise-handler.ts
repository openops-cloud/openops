import { logger } from './logger';

export function rejectedPromiseHandler(promise: Promise<unknown>) {
  promise.catch((error) => {
    logger.error('A promise was rejected', { error });
  });
}
