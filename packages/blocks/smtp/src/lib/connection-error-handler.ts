import { logger } from '@openops/server-shared';

export function connectionErrorHandler(error: unknown): {
  valid: false;
  error: string;
} {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : undefined;

  logger.debug('Failed to validate SMTP connection', error);
  switch (code) {
    case 'EDNS':
      return {
        valid: false,
        error: 'SMTP server not found or unreachable. Error Code: EDNS',
      };
    case 'CONN':
      return {
        valid: false,
        error:
          'Could not establish a connection to the SMTP server. Error Code: CONN',
      };
    case 'ETIMEDOUT':
      return {
        valid: false,
        error: 'Connection to the SMTP server timed out. Error Code: ETIMEDOUT',
      };
    default:
      break;
  }

  const errorMessage = code
    ? `SMTP connection failed with error code: ${code}`
    : JSON.stringify(error);

  return {
    valid: false,
    error: errorMessage,
  };
}
