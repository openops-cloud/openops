import { BaseModel } from '@openops/shared';

export type OAuthSigningKeyStatus = 'active' | 'retiring' | 'retired';

export type OAuthSigningKey = BaseModel<string> & {
  /** AES-encrypted PKCS#8 private key, serialized `EncryptedObject` JSON. */
  privateKeyEncrypted: string;
  publicKeyPem: string;
  status: OAuthSigningKeyStatus;
};

export type OAuthTokenEndpointAuthMethod = 'none' | 'client_secret_basic';

// No `scope`: what a token gets is decided by the resource it names, checked at
// `/authorize`. Storing a registered scope would be a second, unconsulted answer.
export type OAuthClient = BaseModel<string> & {
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod;
  clientSecretHash: string | null;
};

/**
 * A validated `/authorize` request awaiting the user's decision. Held server-side so
 * consent cannot be forged through crafted URL parameters.
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

// No `userId`: the grant is where the acting user is recorded.
export type OAuthRefreshToken = BaseModel<string> & {
  tokenHash: string;
  grantId: string;
  /** Shared by every token rotated from the same original issuance. */
  familyId: string;
  clientId: string;
  resource: string;
  scope: string;
  /** Where this chain is acting; carried forward on rotation unless the client moves it. */
  projectId: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type OAuthGrantStatus = 'active' | 'revoked';

/**
 * One authorized connection. A user may hold several for the same client, each from a
 * separate authorization, and revoke them independently.
 *
 * No `projectId`: a connection can switch project, so it lives on the refresh token that
 * carries the chain forward. No `scope`: it would restate `resourceId`.
 */
export type OAuthGrant = BaseModel<string> & {
  clientId: string;
  userId: string;
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
  /** The only project this token may act on. Fixed at mint time. */
  project_id: string;
};

export type OAuthTokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token?: string;
};
