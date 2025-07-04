import { AppSystemProp, system } from './system';

const ONE_MB_IN_BYTES = 1024 * 1024;
const DEFAULT_FASTIFY_BODY_LIMIT = 10 * ONE_MB_IN_BYTES;
export const getFastifyBodyLimit = (): number => {
  const bodyLimitInMb = Number.parseInt(
    system.getOrThrow<string>(AppSystemProp.FASTIFY_BODY_LIMIT_MB),
  );
  if (Number.isNaN(bodyLimitInMb)) {
    return DEFAULT_FASTIFY_BODY_LIMIT;
  }
  return ONE_MB_IN_BYTES * bodyLimitInMb;
};
