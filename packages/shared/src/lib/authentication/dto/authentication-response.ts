import { OpenOpsId } from '../../common/id-generator';
import { OrganizationRole } from '../../user';

export type InternalAuthenticationPayload = {
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

export const createAuthResponse = (
  authResponse: InternalAuthenticationPayload,
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
