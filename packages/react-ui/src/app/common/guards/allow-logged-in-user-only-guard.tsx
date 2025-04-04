import { LoadingSpinner } from '@openops/components/ui';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { Suspense } from 'react';
import { Navigate } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { platformHooks } from '@/app/common/hooks/platform-hooks';
import { projectHooks } from '@/app/common/hooks/project-hooks';
import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { SocketProvider } from '@/app/common/providers/socket-provider';
import { authenticationSession } from '@/app/lib/authentication-session';
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
  if (!authenticationSession.isLoggedIn()) {
    return <Navigate to="/sign-in" replace />;
  }
  const token = authenticationSession.getToken();
  if (!token || isJwtExpired(token)) {
    authenticationSession.logOut();
    return <Navigate to="/sign-in" replace />;
  }
  projectHooks.prefetchProject();
  platformHooks.prefetchPlatform();
  flagsHooks.useFlags();
  userSettingsHooks.useUserSettings();
  userHooks.useUserMeta();

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
