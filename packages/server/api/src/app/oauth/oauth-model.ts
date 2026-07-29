import { BaseModel } from '@openops/shared';

export type OAuthSigningKeyStatus = 'active' | 'retiring' | 'retired';

export type OAuthSigningKey = BaseModel<string> & {
  /** AES-encrypted PKCS#8 private key, serialized `EncryptedObject` JSON. */
  privateKeyEncrypted: string;
  publicKeyPem: string;
  status: OAuthSigningKeyStatus;
};

export type OAuthTokenEndpointAuthMethod = 'none' | 'client_secret_basic';

/**
 * No `scope`. A client may send one at registration, but what a token actually gets is
 * decided by the resource it names (see `resource-registry`), checked at `/authorize`.
 * Storing the requested scope would be a second, unconsulted answer to the same question.
 */
export type OAuthClient = BaseModel<string> & {
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
  clientSecretHash: string | null;
};

/**
 * A validated `/authorize` request awaiting the user's decision. Holding the
 * validated parameters server-side is what keeps consent from being forgeable
 * through crafted URL parameters. The acting user is not known until the
 * decision is submitted, so it is recorded on the grant instead.
 */
export type OAuthPendingAuthorization = BaseModel<string> & {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  state: string | null;
  expiresAt: string;
  consumedAt: string | null;
};

export type OAuthAuthorizationCode = BaseModel<string> & {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  expiresAt: string;
  consumedAt: string | null;
};

/** No `userId`: the grant is where the acting user is recorded, and it is authoritative. */
export type OAuthRefreshToken = BaseModel<string> & {
  tokenHash: string;
  grantId: string;
  /** Shared by every token rotated from the same original issuance. */
  familyId: string;
  clientId: string;
  resource: string;
  scope: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type OAuthGrantStatus = 'active' | 'revoked';

/**
 * One authorized connection. A user may hold several for the same client — each
 * from a separate authorization — and revoke them independently.
 *
 * `projectId` records where the connection started, and is the default used when minting
 * if no project is asked for. It does not limit the connection: a token may name any
 * project the user belongs to, so this is not rewritten when one does.
 *
 * No `scope`: it would restate `resourceId`, since each resource grants exactly one.
 * `revokedAt` is write-only on purpose — `status` is what code checks, and this answers
 * "when" for anyone looking afterwards.
 */
export type OAuthGrant = BaseModel<string> & {
  clientId: string;
  userId: string;
  projectId: string;
  resourceId: string;
  status: OAuthGrantStatus;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type OAuthAccessTokenClaims = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  client_id: string;
  scope: string;
  grant_id: string;
  /**
   * The project this token may act on. Required, and fixed at mint time: the
   * token's authority never changes after issuance, and the holder cannot
   * redirect it at another project.
   */
  project_id: string;
};

export type OAuthTokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token?: string;
};
