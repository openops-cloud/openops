import { Project, ProjectMemberRole, User } from '@openops/shared';

export enum Provider {
  EMAIL = 'EMAIL',
  FEDERATED = 'FEDERATED',
}

export type AuthenticationServiceHooks = {
  preSignIn(p: PreParams): Promise<void>;
  preSignUp(p: PreSignUpParams): Promise<void>;
  postSignUp(p: PostParams): Promise<PostResult>;
  postSignIn(p: PostParams): Promise<PostResult>;
};

type PreSignUpParams = {
  name: string;
  email: string;
  password: string;
  organizationId: string | null;
  provider: Provider;
};

type PreParams = {
  email: string;
  organizationId: string | null;
  provider: Provider;
};

type PostParams = {
  user: User;
  tablesAccessToken: string;
  tablesRefreshToken: string;
  referringUserId?: string;
};

type PostResult = {
  user: User;
  project: Project;
  token: string;
  tablesRefreshToken: string;
  projectRole: ProjectMemberRole | null;
};
