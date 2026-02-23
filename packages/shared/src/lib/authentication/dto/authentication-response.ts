import { OpenOpsId } from '../../common/id-generator';
import { OrganizationRole, User } from '../../user';

export type UserWithoutPassword = Omit<User, 'password'>;

export type AuthenticationResponseWithSensitiveData = UserWithoutPassword & {
  token: string;
  projectId: string;
  projectRole: string;
  tablesRefreshToken: string;
  tablesWorkspaceId: number;
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
