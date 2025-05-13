import { logger } from './logger';
import { system } from './system/system';
import { SharedSystemProp } from './system/system-prop';

export const exceptionHandler = {
  handle: (e: unknown): void => {
    logger.error('Caught an unknown exception', e);
  },
};

const ENRICH_ERROR_CONTEXT =
  system.getBoolean(SharedSystemProp.ENRICH_ERROR_CONTEXT) ?? false;

export const enrichErrorContext = ({
  error,
  key,
  value,
}: EnrichErrorContextParams): unknown => {
  if (error instanceof Error) {
    if ('context' in error && error.context instanceof Object) {
      if (value instanceof Object) {
        const enrichedError = Object.assign(error, {
          ...error.context,
          ...value,
        });
        return enrichedError;
      }
      const enrichedError = Object.assign(error, {
        ...error.context,
        [key]: value,
      });

      return enrichedError;
    } else {
      const enrichedError = Object.assign(error, {
        context: {
          [key]: value,
        },
      });

      return enrichedError;
    }
  }

  return error;
};

type EnrichErrorContextParams = {
  error: unknown;
  key: string;
  value: unknown;
};
