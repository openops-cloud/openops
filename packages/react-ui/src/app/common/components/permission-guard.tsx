import React from 'react';

import { Permission } from '@openops/shared';
import { Slot } from '@radix-ui/react-slot';

type PermissionGuardProps = {
  permission: Permission | Permission[];
  children: React.ReactNode;
  tooltipClassName?: string;
  tooltipLocation?: 'bottom' | 'left';
};

export const PermissionGuard = React.forwardRef<
  HTMLElement,
  PermissionGuardProps
>(({ children, ...rest }, ref) => {
  return (
    <Slot ref={ref} {...rest}>
      {children}
    </Slot>
  );
});

PermissionGuard.displayName = 'PermissionGuard';
