import { Project, ProjectMemberRole, Provider, User } from '@openops/shared';

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  trackEvents: boolean;
  newsLetter: boolean;
  verified: boolean;
  organizationId: string | null;
  provider: Provider;
};

export type SignInParams = {
  email: string;
  password: string;
  organizationId: string | null;
  provider: Provider;
};

export type AssertPasswordsMatchParams = {
  requestPassword: string;
  userPassword: string;
};

export type ProjectContext = {
  user: User;
  project: Project;
  token: string;
  tablesRefreshToken: string;
  projectRole: ProjectMemberRole;
};
