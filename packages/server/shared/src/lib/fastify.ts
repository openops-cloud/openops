import { ApplicationError, ErrorCode } from '@openops/shared';
import { AppSystemProp, system } from './system';

export const ONE_MB_IN_BYTES = 1024 * 1024;
const REQUEST_BODY_LIMIT_BUFFER_MB = 0.5;

const REQUEST_BODY_LIMIT_MB: number = (() => {
  const rawValue = system.getOrThrow<string>(AppSystemProp.REQUEST_BODY_LIMIT);
  const value = Number.parseInt(rawValue, 10);

  if (Number.isNaN(value)) {
    throw new ApplicationError(
      {
        code: ErrorCode.SYSTEM_PROP_INVALID,
        params: { prop: AppSystemProp.REQUEST_BODY_LIMIT },
      },
      `System property OPS_${AppSystemProp.REQUEST_BODY_LIMIT} is not a valid integer`,
    );
  }

  return value;
})();

export const MAX_REQUEST_BODY_BYTES = REQUEST_BODY_LIMIT_MB * ONE_MB_IN_BYTES;
export const MAX_REQUEST_BODY_WITH_BUFFER_MB =
  REQUEST_BODY_LIMIT_MB - REQUEST_BODY_LIMIT_BUFFER_MB;
