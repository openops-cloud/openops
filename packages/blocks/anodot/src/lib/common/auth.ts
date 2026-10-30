import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';

export interface AnodotTokens {
  Authorization: string;
  apikey: string;
}

/**
 * Umbrella offers two account models. User Management 1.0 authenticates against a
 * separate tokenizer host and lists accounts via `/v1/users`; User Management 2.0
 * authenticates against the API host and lists accounts via `/v2/user-management`.
 */
export type UserManagementVersion = '1.0' | '2.0';

/**
 * The subset of the Umbrella connection the session helper needs.
 * `userManagementVersion` is optional because connections created before the
 * field existed do not carry it; those must keep behaving as 1.0.
 */
export interface UmbrellaAuthProps {
  authUrl: string;
  apiUrl: string;
  username: string;
  password: string;
  userManagementVersion?: unknown;
}

export interface UmbrellaSession {
  version: UserManagementVersion;
  apiUrl: string;
  tokens: AnodotTokens;
}

/**
 * Anything other than an explicit '2.0' is treated as 1.0 so that connections
 * stored before the version field existed keep their original behaviour.
 */
export function resolveUserManagementVersion(
  value: unknown,
): UserManagementVersion {
  return value === '2.0' ? '2.0' : '1.0';
}

export function otherUserManagementVersion(
  version: UserManagementVersion,
): UserManagementVersion {
  return version === '2.0' ? '1.0' : '2.0';
}

export async function createUmbrellaSession(
  auth: UmbrellaAuthProps,
  versionOverride?: UserManagementVersion,
): Promise<UmbrellaSession> {
  const version =
    versionOverride ?? resolveUserManagementVersion(auth.userManagementVersion);

  const tokens = await requestTokens(
    loginUrl(version, auth),
    auth.username,
    auth.password,
  );

  return { version, apiUrl: auth.apiUrl, tokens };
}

/**
 * Both versions accept the same credentials body and return the same token
 * pair; only the login endpoint differs. 1.0 uses the separate tokenizer host,
 * 2.0 uses the API host.
 */
function loginUrl(
  version: UserManagementVersion,
  auth: UmbrellaAuthProps,
): string {
  return version === '2.0'
    ? `${auth.apiUrl}/v1/authentication/token/generate`
    : `${auth.authUrl}/credentials`;
}

async function requestTokens(
  url: string,
  username: string,
  password: string,
): Promise<AnodotTokens> {
  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
  });

  return makeHttpRequest<AnodotTokens>('POST', url, headers, {
    username,
    password,
  });
}
