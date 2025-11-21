import { FlagsMap } from '@/app/lib/flags-api';

export const getFederatedUrlBasedOnFlags = (flags?: FlagsMap) =>
  flags?.FEDERATED_LOGIN_ENABLED
    ? (flags.FRONTEGG_URL as string | undefined)
    : undefined;
