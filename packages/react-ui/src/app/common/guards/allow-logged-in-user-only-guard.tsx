import { LoadingSpinner } from '@openops/components/ui';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { Suspense, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { platformHooks } from '@/app/common/hooks/platform-hooks';
import { projectHooks } from '@/app/common/hooks/project-hooks';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SocketProvider } from '@/app/common/providers/socket-provider';
// eslint-disable-next-line import/no-restricted-paths
import { getFederatedUrlBasedOnFlags } from '@/app/features/authentication/lib/utils';
// eslint-disable-next-line import/no-restricted-paths
import { appConnectionsHooks } from '@/app/features/connections/lib/app-connections-hooks';
import { authenticationSession } from '@/app/lib/authentication-session';
import { navigationUtil } from '@/app/lib/navigation-util';
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

type AllowOnlyLoggedInUserOnlyGuardProps = {
  children: React.ReactNode;
};
export const AllowOnlyLoggedInUserOnlyGuard = ({
  children,
}: AllowOnlyLoggedInUserOnlyGuardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = authenticationSession.getToken();
  const isLoggedIn = authenticationSession.isLoggedIn();
  const expired = !token || isJwtExpired(token);

  projectHooks.prefetchProject();
  platformHooks.prefetchPlatform();
  platformHooks.prefetchNewerVersionInfo(queryClient);

  const { data: flags } = flagsHooks.useFlags();
  userSettingsHooks.useUserSettings();
  userHooks.useUserMeta();
  appConnectionsHooks.useConnectionsMetadata();

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
  ]);

  if (!isLoggedIn || expired) {
    return <Navigate to="/sign-in" replace />;
  }

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
