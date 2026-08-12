import { stripTrailingSlashes } from '../common/canonical-url';
import { oauthConfig } from '../config/oauth-config';
import { getSupportedScopes } from './resource-registry';

export type AuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  scopes_supported: string[];
  authorization_response_iss_parameter_supported: boolean;
};

// RFC 8414 metadata. No OpenID Connect claims: no id tokens are issued, and advertising
// them would mislead clients that branch on those fields.
export function buildAuthorizationServerMetadata(): AuthorizationServerMetadata {
  const issuer = oauthConfig.getIssuerUrl();

  return {
    issuer,
    authorization_endpoint: `${issuer}/v1/oauth/authorize`,
    token_endpoint: `${issuer}/v1/oauth/token`,
    registration_endpoint: `${issuer}/v1/oauth/register`,
    revocation_endpoint: `${issuer}/v1/oauth/revoke`,
    jwks_uri: `${issuer}/v1/oauth/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
    scopes_supported: getSupportedScopes(),
    authorization_response_iss_parameter_supported: true,
  };
}

// RFC 8414 §3 keeps the issuer's own path component in the metadata path, so an issuer
// served under a sub-path stays discoverable.
export function getWellKnownPathVariants(basePath: string): string[] {
  const issuerPath = stripTrailingSlashes(
    new URL(oauthConfig.getIssuerUrl()).pathname,
  );

  return issuerPath ? [basePath, `${basePath}${issuerPath}`] : [basePath];
}
