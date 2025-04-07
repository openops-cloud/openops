import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { userHooks } from '@/app/common/hooks/user-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { FlagId } from '@openops/shared';

export const useCandu = () => {
  const userId = authenticationSession.getCurrentUser()?.id;
  const clientToken = flagsHooks.useFlag<string>(
    FlagId.CANDU_CLIENT_TOKEN,
  ).data;
  const { userMeta } = userHooks.useUserMeta();
  const isCanduEnabled = clientToken && userId && userMeta?.trackEvents;

  return {
    isCanduEnabled,
    canduClientToken: clientToken,
    canduUserId: userId,
  };
};
