import { User } from '@openops/shared';

export enum Provider {
  EMAIL = 'EMAIL',
  FEDERATED = 'FEDERATED',
}

export type AuthenticationServiceHooks = {
  preSignIn(p: PreParams): Promise<void>;
  preSignUp(p: PreSignUpParams): Promise<void>;
  postSignUp(p: PostParams): Promise<void>;
  postSignIn(p: PostParams): Promise<void>;
};

type PreSignUpParams = {
  name: string;
  email: string;
  password: string;
};

type PreParams = {
  email: string;
  organizationId: string | null;
  provider: Provider;
};

type PostParams = {
  user: User;
};
