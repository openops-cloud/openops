import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import {
  buildAuthorizationServerMetadata,
  getWellKnownPathVariants,
} from '../../../../src/app/oauth/discovery/oauth-metadata';

const ISSUER = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';

describe('buildAuthorizationServerMetadata', () => {
  beforeEach(() => {
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('advertises exactly the endpoints and capabilities that exist', () => {
    expect(buildAuthorizationServerMetadata()).toEqual({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/v1/oauth/authorize`,
      token_endpoint: `${ISSUER}/v1/oauth/token`,
      registration_endpoint: `${ISSUER}/v1/oauth/register`,
      revocation_endpoint: `${ISSUER}/v1/oauth/revoke`,
      jwks_uri: `${ISSUER}/v1/oauth/jwks.json`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
      scopes_supported: ['api', 'mcp'],
      authorization_response_iss_parameter_supported: true,
    });
  });

  it('claims no OpenID Connect capability, because none is implemented', () => {
    const document = buildAuthorizationServerMetadata() as Record<
      string,
      unknown
    >;

    for (const oidcOnlyField of [
      'id_token_signing_alg_values_supported',
      'subject_types_supported',
      'userinfo_endpoint',
      'claims_supported',
    ]) {
      expect(document[oidcOnlyField]).toBeUndefined();
    }
  });

  it('offers no implicit or password grant', () => {
    const { grant_types_supported, response_types_supported } =
      buildAuthorizationServerMetadata();

    expect(grant_types_supported).not.toContain('implicit');
    expect(grant_types_supported).not.toContain('password');
    expect(response_types_supported).not.toContain('token');
  });

  it('never advertises plain PKCE', () => {
    expect(
      buildAuthorizationServerMetadata().code_challenge_methods_supported,
    ).toEqual(['S256']);
  });

  it('drops the mcp scope when no mcp resource is deployed', () => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(undefined);

    expect(buildAuthorizationServerMetadata().scopes_supported).toEqual([
      'api',
    ]);
  });
});

describe('getWellKnownPathVariants', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('also serves the issuer path-aware location required by RFC 8414 §3', () => {
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);

    expect(
      getWellKnownPathVariants('/.well-known/oauth-authorization-server'),
    ).toEqual([
      '/.well-known/oauth-authorization-server',
      '/.well-known/oauth-authorization-server/api',
    ]);
  });

  it('serves only the root location when the issuer has no path', () => {
    jest
      .spyOn(oauthConfig, 'getIssuerUrl')
      .mockReturnValue('https://ops.example.com');

    expect(
      getWellKnownPathVariants('/.well-known/oauth-authorization-server'),
    ).toEqual(['/.well-known/oauth-authorization-server']);
  });
});
