import { ProjectMemberRole } from '../../project';
import { User } from '../../user/user';

export type UserWithoutPassword = Omit<User, 'password'>;

export type AuthenticationResponse = UserWithoutPassword & {
  token: string;
  projectId: string;
  hasTemplatesPrivileges: boolean;
  projectRole: ProjectMemberRole | null;
  tablesRefreshToken: string;
  tablesWorkspaceId: number;
};
