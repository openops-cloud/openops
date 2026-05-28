import { logger } from '@openops/server-shared';
import { isNil } from '@openops/shared';
import { ProcessorFn } from './types';

export const jsonProcessor: ProcessorFn = (_property, value) => {
  if (isNil(value)) {
    return value;
  }
  try {
    if (typeof value === 'object') {
      return value;
    }
    return JSON.parse(value);
  } catch (error) {
    logger.warn('Failed to read or decode JSON file.', error);
    return undefined;
  }
};
