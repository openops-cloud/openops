import { Suspense, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { getFederatedUrlBasedOnFlags } from '@/app/common/auth/lib/utils';
import { FullPageSpinner } from '@/app/common/components/full-page-spinner';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { platformHooks } from '@/app/common/hooks/platform-hooks';
import { projectHooks } from '@/app/common/hooks/project-hooks';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SocketProvider } from '@/app/common/providers/socket-provider';
// eslint-disable-next-line import/no-restricted-paths
import { appConnectionsHooks } from '@/app/features/connections/lib/app-connections-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { getFronteggApp } from '@/app/lib/frontegg-setup';
import { navigationUtil } from '@/app/lib/navigation-util';
import { FlagId } from '@openops/shared';
import { useQueryClient } from '@tanstack/react-query';
import { userHooks } from '../hooks/user-hooks';

const LoggedIn = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();

  projectHooks.prefetchProject();
  platformHooks.prefetchPlatform();
  platformHooks.prefetchNewerVersionInfo(queryClient);

  userSettingsHooks.useUserSettings();
  userHooks.useUserMeta();
  appConnectionsHooks.useConnectionsMetadata();

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SocketProvider>{children}</SocketProvider>
    </Suspense>
  );
};

type AllowOnlyLoggedInUserOnlyGuardProps = {
  children: React.ReactNode;
};
export const AllowOnlyLoggedInUserOnlyGuard = ({
  children,
}: AllowOnlyLoggedInUserOnlyGuardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: flags } = flagsHooks.useFlags();
  const { data: isFederatedLogin } = flagsHooks.useFlag<boolean | undefined>(
    FlagId.FEDERATED_LOGIN_ENABLED,
  );

  const fronteggToken =
    getFronteggApp()?.store.getState().auth.user?.accessToken;
  const isLoggedIn = isFederatedLogin
    ? fronteggToken
    : authenticationSession.isLoggedIn();

  useEffect(() => {
    let isMounted = true;
    async function doLogout() {
      try {
        await authenticationSession.logOut({
          userInitiated: false,
          navigate,
          federatedLoginUrl: getFederatedUrlBasedOnFlags(flags),
        });
      } catch (e) {
        if (isMounted) {
          console.error('Logout failed:', e);
        }
      }
    }
    if (!isLoggedIn) {
      navigationUtil.save(location.pathname + location.search);
      doLogout();
    }
    return () => {
      isMounted = false;
    };
  }, [
    isLoggedIn,
    location.pathname,
    location.search,
    navigate,
    flags,
    isFederatedLogin,
  ]);

  if (!isLoggedIn && !isFederatedLogin) {
    return <Navigate to="/sign-in" replace />;
  } else if (!isLoggedIn && isFederatedLogin) {
    return <Navigate to="/" replace />;
  }

  return <LoggedIn>{children}</LoggedIn>;
};
