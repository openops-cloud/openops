import { OrganizationRole, Principal } from '@openops/shared';

export type ProjectPermissions = {
  analytics: boolean;
};

export type ProjectPermissionsService = {
  getProjectPermissions(
    principal: Principal,
    organizationRole: OrganizationRole,
  ): Promise<ProjectPermissions> | ProjectPermissions;
};

export const projectPermissionsService: ProjectPermissionsService = {
  getProjectPermissions(
    _principal: Principal,
    _organizationRole: OrganizationRole,
  ): ProjectPermissions {
    return {
      analytics: true,
    };
  },
};
