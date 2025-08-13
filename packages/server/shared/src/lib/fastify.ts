import { ApplicationError, ErrorCode } from '@openops/shared';
import { AppSystemProp, system } from './system';

export const ONE_MB_IN_BYTES = 1024 * 1024;

export const getMaximumRequestBodySizeInMegabytes = (): number => {
  const bodyLimitInMb = Number.parseInt(
    system.getOrThrow<string>(AppSystemProp.REQUEST_BODY_LIMIT),
  );

  if (Number.isNaN(bodyLimitInMb)) {
    throw new ApplicationError(
      {
        code: ErrorCode.SYSTEM_PROP_INVALID,
        params: {
          prop: AppSystemProp.REQUEST_BODY_LIMIT,
        },
      },
      `System property OPS_${AppSystemProp.REQUEST_BODY_LIMIT} is not a valid integer`,
    );
  }

  return bodyLimitInMb;
};

export const getMaximumRequestBodySizeInBytes = (): number => {
  return getMaximumRequestBodySizeInMegabytes() * ONE_MB_IN_BYTES;
};

export const getMaximumRequestBodySizeWithBufferInMegabytes = (): number => {
  return getMaximumRequestBodySizeInMegabytes() - 0.5;
};
