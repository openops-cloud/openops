import { LoadingSpinner } from '@openops/components/ui';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { Suspense, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { getFederatedUrlBasedOnFlags } from '@/app/common/auth/lib/utils';
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

function isJwtExpired(token: string): boolean {
  if (!token) {
    return true;
  }
  try {
    const decoded = jwtDecode(token);
    if (decoded && decoded.exp && dayjs().isAfter(dayjs.unix(decoded.exp))) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

const LoggedIn = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();

  projectHooks.prefetchProject();
  platformHooks.prefetchPlatform();
  platformHooks.prefetchNewerVersionInfo(queryClient);

  userSettingsHooks.useUserSettings();
  userHooks.useUserMeta();
  appConnectionsHooks.useConnectionsMetadata();

  return (
    <Suspense
      fallback={
        <div className=" flex h-screen w-screen items-center justify-center ">
          <LoadingSpinner size={50}></LoadingSpinner>
        </div>
      }
    >
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

  const token = authenticationSession.getToken();
  const fronteggToken =
    getFronteggApp()?.store.getState().auth.user?.accessToken;
  const isLoggedIn = isFederatedLogin
    ? fronteggToken
    : authenticationSession.isLoggedIn();
  const expired = !token || isJwtExpired(token);

  useEffect(() => {
    let isMounted = true;
    async function doLogout() {
      try {
        if (isFederatedLogin) {
          getFronteggApp()?.logout();
        } else {
          await authenticationSession.logOut({
            userInitiated: false,
            navigate,
            federatedLoginUrl: getFederatedUrlBasedOnFlags(flags),
          });
        }
      } catch (e) {
        if (isMounted) {
          console.error('Logout failed:', e);
        }
      }
    }
    if (!isLoggedIn || expired) {
      navigationUtil.save(location.pathname + location.search);
      doLogout();
    }
    return () => {
      isMounted = false;
    };
  }, [
    isLoggedIn,
    expired,
    location.pathname,
    location.search,
    navigate,
    flags,
    isFederatedLogin,
  ]);

  if ((!isLoggedIn || expired) && !isFederatedLogin) {
    return <Navigate to="/sign-in" replace />;
  } else if (!isLoggedIn && isFederatedLogin) {
    return <Navigate to="/" replace />;
  }

  return <LoggedIn>{children}</LoggedIn>;
};
