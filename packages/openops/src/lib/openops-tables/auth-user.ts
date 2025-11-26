import { AxiosHeaders } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { makeOpenOpsTablesPost } from './requests-helpers';

export interface AuthTokens {
  token: string;
  refresh_token: string;
}

export async function authenticateUserInOpenOpsTables(
  email: string,
  password: string,
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<AuthTokens> {
  const requestBody = {
    email,
    password,
  };

  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
  });

  return makeOpenOpsTablesPost<AuthTokens>(
    'api/user/token-auth/',
    requestBody,
    headers,
    axiosRetryConfig,
  );
}
