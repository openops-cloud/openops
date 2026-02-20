import { Permission } from '@openops/shared';

type PermissionGuardProps = {
  permission: Permission | Permission[];
  children: React.ReactNode;
};

export const PermissionGuard = ({
  permission,
  children,
}: PermissionGuardProps) => {
  return { children };
};
