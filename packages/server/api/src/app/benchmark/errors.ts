import { ApplicationError, ErrorCode } from '@openops/shared';

export function throwValidationError(message: string): never {
  throw new ApplicationError(
    { code: ErrorCode.VALIDATION, params: { message } },
    message,
  );
}
