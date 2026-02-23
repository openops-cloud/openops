import { OpenOpsId } from '../../common/id-generator';
import { OrganizationRole } from '../../user';

export type AuthenticationResponseWithSensitiveData = {
  id: OpenOpsId;
  email: string;
  token: string;
  projectId: string;
  projectRole: string;
  tablesRefreshToken: string;
  tablesWorkspaceId: number;
  organizationId: string | null;
  organizationRole: OrganizationRole;
};

export type AuthenticationResponse = {
  id: OpenOpsId;
  email: string;
  projectId: string;
  projectRole: string;
  organizationId: string | null;
  organizationRole: OrganizationRole;
};

export const sanitizeAuthResponse = (
  authResponse: AuthenticationResponseWithSensitiveData,
): AuthenticationResponse => {
  return {
    id: authResponse.id,
    email: authResponse.email,
    projectId: authResponse.projectId,
    projectRole: authResponse.projectRole,
    organizationId: authResponse.organizationId,
    organizationRole: authResponse.organizationRole,
  };
};
