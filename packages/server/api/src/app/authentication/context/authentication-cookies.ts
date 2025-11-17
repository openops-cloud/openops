import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { AuthenticationResponse } from '@openops/shared';
import { FastifyReply } from 'fastify';
import { jwtDecode } from 'jwt-decode';
import { getSubDomain } from '../../helper/sub-domain';

export function setAuthCookiesAndReply(
  reply: FastifyReply,
  response: AuthenticationResponse,
): FastifyReply {
  const date = jwtDecode<{ exp: number }>(response.tablesRefreshToken);
  const cookieExpiryDate = new Date(date.exp * 1000);

  let replyWithCookies = reply
    .setCookie('jwt_token', response.tablesRefreshToken, {
      domain: getOpenOpsSubDomain(),
      path: '/',
      signed: true,
      httpOnly: false,
      expires: cookieExpiryDate,
    })
    .setCookie('token', response.token, {
      path: '/',
      signed: true,
      httpOnly: false,
      expires: cookieExpiryDate,
      sameSite: 'lax',
    });

  if (response.tablesWorkspaceId !== undefined) {
    replyWithCookies = replyWithCookies.setCookie(
      'baserow_group_id',
      String(response.tablesWorkspaceId),
      {
        domain: getOpenOpsSubDomain(),
        path: '/',
        signed: true,
        httpOnly: false,
        expires: cookieExpiryDate,
        sameSite: 'lax',
      },
    );
  }

  return replyWithCookies.send(response);
}

export function removeAuthCookiesAndReply(reply: FastifyReply): FastifyReply {
  return reply
    .clearCookie('jwt_token', {
      domain: getOpenOpsSubDomain(),
      path: '/',
    })
    .clearCookie('token', {
      path: '/',
    })
    .clearCookie('baserow_group_id', {
      domain: getOpenOpsSubDomain(),
      path: '/',
    })
    .send('Cookies removed');
}

function getOpenOpsSubDomain(): string {
  const frontendUrl = system.getOrThrow(SharedSystemProp.FRONTEND_URL);

  const tablesUrl = system.getOrThrow(AppSystemProp.OPENOPS_TABLES_PUBLIC_URL);

  return getSubDomain(frontendUrl, tablesUrl);
}
