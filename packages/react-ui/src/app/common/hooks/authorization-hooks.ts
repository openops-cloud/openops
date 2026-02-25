import React from 'react';

import { authenticationSession } from '@/app/lib/authentication-session';
import { Permission } from '@openops/shared';

export const useAuthorization = () => {
  const role = authenticationSession.getUserProjectRole();

  const checkAccess = React.useCallback((_permission: Permission) => {
    return true;
  }, []);

  return { checkAccess, role };
};
