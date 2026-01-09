import {
  ProjectMemberRole,
  ProjectWithoutSensitiveData,
  Provider,
  User,
} from '@openops/shared';

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
  externalId?: string;
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
  token: string;
  tablesRefreshToken: string;
  projectRole: ProjectMemberRole;
  project: ProjectWithoutSensitiveData;
  hasTemplatesPrivileges: boolean;
  hasAnalyticsPrivileges: boolean;
};
