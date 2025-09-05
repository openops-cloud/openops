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

  useEffect(() => {
    if (!isLoggedIn || expired) {
      navigationUtil.save(location.pathname + location.search);
      (async () => {
        await authenticationSession.logOut({
          userInitiated: false,
          navigate,
        });
      })();
    }
  }, [isLoggedIn, expired, location.pathname, location.search, navigate]);

  if (!isLoggedIn || expired) {
    return <Navigate to="/sign-in" replace />;
  }

  projectHooks.prefetchProject();
  platformHooks.prefetchPlatform();
  platformHooks.prefetchNewerVersionInfo(queryClient);

  flagsHooks.useFlags();
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
