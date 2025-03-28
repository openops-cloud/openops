import {
  AuthenticationType,
  // HttpMessageBody,
  HttpMethod,
  HttpRequest,
  // QueryParams,
  httpClient,
} from '@openops/blocks-common';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import { ternaryAuth } from './auth';

export async function sendTernaryRequest(
  request: HttpRequest & { auth: ternaryAuth },
) {
  const validJwt = await validateJwt(request.auth.apiKey);
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
    if (decoded && decoded.exp && dayjs().isAfter(dayjs.unix(decoded.exp))) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}
