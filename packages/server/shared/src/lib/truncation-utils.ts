import { logger } from './logger';

const TRUNCATION_DEFAULT_MAX_LENGTH = 1000;
const TRUNCATION_DEFAULT_TRUNCATE_MESSAGE = '... [truncated]';

export function safeStringifyAndTruncate(
  value: unknown,
  maxLength = TRUNCATION_DEFAULT_MAX_LENGTH,
  truncateMessage = TRUNCATION_DEFAULT_TRUNCATE_MESSAGE,
): string {
  let stringValue: string;

  try {
    if (typeof value === 'object' && value !== null) {
      const seen = new WeakSet();
      stringValue = JSON.stringify(
        value,
        (_, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '';
            }
            seen.add(val);
          }
          return val;
        },
        2,
      );
    } else {
      stringValue = String(value);
    }
  } catch (error) {
    logger.error('Failed to stringify value', { error });
    stringValue = '';
  }

  if (stringValue.length <= maxLength) {
    return stringValue;
  }

  return stringValue.substring(0, maxLength) + truncateMessage;
}
