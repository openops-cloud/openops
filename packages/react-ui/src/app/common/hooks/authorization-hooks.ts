import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { authenticationSession } from '@/app/lib/authentication-session';
import { Permission } from '@openops/shared';

export const useAuthorization = () => {
  const role = authenticationSession.getUserProjectRole();

  const checkAccess = React.useCallback((_permission: Permission) => {
    return true;
  }, []);

  return { checkAccess, role };
};

export const useCheckAccessAndRedirect = (permission: Permission) => {
  const { checkAccess } = useAuthorization();
  const navigate = useNavigate();
  const hasAccess = checkAccess(permission);

  useEffect(() => {
    if (!hasAccess) {
      navigate('/', { replace: true });
    }
  }, [hasAccess, navigate]);

  return hasAccess;
};
