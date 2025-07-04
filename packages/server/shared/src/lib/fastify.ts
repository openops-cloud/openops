import { ApplicationError, ErrorCode } from '@openops/shared';
import { AppSystemProp, system } from './system';

const ONE_MB_IN_BYTES = 1024 * 1024;
export const getFastifyBodyLimitOrThrow = (): number => {
  const bodyLimitInMb = Number.parseInt(
    system.getOrThrow<string>(AppSystemProp.BODY_REQUEST_LIMIT),
  );
  if (Number.isNaN(bodyLimitInMb)) {
    throw new ApplicationError(
      {
        code: ErrorCode.SYSTEM_PROP_INVALID,
        params: {
          prop: AppSystemProp.BODY_REQUEST_LIMIT,
        },
      },
      `System property OPS_${AppSystemProp.BODY_REQUEST_LIMIT} is not a valid integer`,
    );
  }
  return ONE_MB_IN_BYTES * bodyLimitInMb;
};
