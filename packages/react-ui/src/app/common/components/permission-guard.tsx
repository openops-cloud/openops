import React from 'react';

import { Permission } from '@openops/shared';

type PermissionGuardProps = {
  permission: Permission | Permission[];
  children: React.ReactNode;
  tooltipClassName?: string;
};

export const PermissionGuard = ({ children }: PermissionGuardProps) => {
  return children;
};
