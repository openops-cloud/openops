import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { AuthenticationResponse } from '@openops/shared';
import { FastifyReply } from 'fastify';
import { jwtDecode } from 'jwt-decode';
import { getSubDomain } from '../../helper/sub-domain';

export function setAuthCookies(
  reply: FastifyReply,
  response: AuthenticationResponse,
  expireInSeconds?: number,
): FastifyReply {
  let cookieExpiryDate: Date;
  if (expireInSeconds) {
    cookieExpiryDate = new Date(expireInSeconds * 1000);
  } else {
    const date = jwtDecode<{ exp: number }>(response.tablesRefreshToken);
    cookieExpiryDate = new Date(date.exp * 1000);
  }

  return reply
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
    })
    .setCookie('baserow_group_id', String(response.tablesWorkspaceId), {
      domain: getOpenOpsSubDomain(),
      path: '/',
      signed: true,
      httpOnly: false,
      expires: cookieExpiryDate,
      sameSite: 'lax',
    });
}

export function removeAuthCookies(reply: FastifyReply): FastifyReply {
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
    });
}

function getOpenOpsSubDomain(): string {
  const frontendUrl = system.getOrThrow(SharedSystemProp.FRONTEND_URL);

  const tablesUrl = system.getOrThrow(AppSystemProp.OPENOPS_TABLES_PUBLIC_URL);

  return getSubDomain(frontendUrl, tablesUrl);
}
