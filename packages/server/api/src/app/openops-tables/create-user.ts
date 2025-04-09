import { AuthUser } from '@openops/common';
import { resilientPost } from './utils';

export async function createUser(values: {
  name: string;
  email: string;
  password: string;
  authenticate?: boolean;
}): Promise<AuthUser> {
  const requestBody = {
    name: values.name,
    email: values.email,
    password: values.password,
    authenticate: values.authenticate ?? false,
  };

  const createUserEndpoint = 'api/user/';
  return resilientPost(createUserEndpoint, requestBody) as Promise<AuthUser>;
}
