import {
  AuthenticationType,
  HttpMethod,
  HttpRequest,
  httpClient,
} from '@openops/blocks-common';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { ternaryAuth } from './auth';

export async function sendTernaryRequest(
  request: HttpRequest & { auth: ternaryAuth },
) {
  const validJwt = validateJwt(request.auth.apiKey);
  if (!validJwt) throw new Error('Invalid JWT');
  return httpClient.sendRequest({
    ...request,
    url: `${request.auth.apiURL}/api/${request.url}`,
    method: HttpMethod.GET,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: request.auth.apiKey,
    },
  });
}

function validateJwt(token: string): boolean {
  if (!token) {
    return false;
  }
  try {
    const decoded = jwtDecode(token);
    const isValid =
      decoded && decoded.exp && dayjs().isBefore(dayjs.unix(decoded.exp));
    return isValid ? true : false;
  } catch (e) {
    return false;
  }
}
