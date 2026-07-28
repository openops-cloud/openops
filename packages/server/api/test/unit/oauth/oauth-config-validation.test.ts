import { AppSystemProp, system } from '@openops/server-shared';
import { oauthConfig } from '../../../src/app/oauth/oauth-config';
import { validateOAuthConfiguration } from '../../../src/app/oauth/oauth-config-validation';

const ISSUER = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';

describe('validateOAuthConfiguration', () => {
  beforeEach(() => {
    jest.spyOn(system, 'get').mockReturnValue(undefined);
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(ISSUER);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a well-formed configuration', () => {
    expect(() => validateOAuthConfiguration()).not.toThrow();
  });

  it('accepts loopback URLs over plain http, for local development', () => {
    jest
      .spyOn(oauthConfig, 'getIssuerUrl')
      .mockReturnValue('http://localhost:3000');
    jest
      .spyOn(oauthConfig, 'getApiAudience')
      .mockReturnValue('http://localhost:3000');
    jest
      .spyOn(oauthConfig, 'getMcpResourceUrl')
      .mockReturnValue('http://localhost:3020/mcp');

    expect(() => validateOAuthConfiguration()).not.toThrow();
  });

  it('accepts a deployment with no mcp resource', () => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(undefined);

    expect(() => validateOAuthConfiguration()).not.toThrow();
  });

  it('refuses an mcp resource that collapses into the api audience', () => {
    // Were these equal, the resource server would accept API-audience tokens and
    // the no-token-passthrough guarantee would silently stop holding.
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(ISSUER);

    expect(() => validateOAuthConfiguration()).toThrow('must differ');
  });

  it.each([
    ['a trailing slash', `${ISSUER}/`],
    ['a different case in the host', 'https://OPS.example.com/api'],
  ])('refuses an mcp resource that differs only by %s', (_label, mcpUrl) => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(mcpUrl);

    expect(() => validateOAuthConfiguration()).toThrow('must differ');
  });

  it.each([
    ['a relative value', '/api'],
    ['a non-URL', 'not a url'],
    ['plain http on a public host', 'http://ops.example.com/api'],
    ['a query string', 'https://ops.example.com/api?x=1'],
    ['a fragment', 'https://ops.example.com/api#f'],
  ])('refuses an issuer that is %s', (_label, issuer) => {
    jest.spyOn(oauthConfig, 'getIssuerUrl').mockReturnValue(issuer);
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(issuer);

    expect(() => validateOAuthConfiguration()).toThrow('OPS_OAUTH_ISSUER_URL');
  });

  it('refuses a malformed mcp resource url', () => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue('not a url');

    expect(() => validateOAuthConfiguration()).toThrow('OPS_MCP_RESOURCE_URL');
  });

  it('refuses to run on sqlite, where the migration is not registered', () => {
    (system.get as jest.Mock).mockImplementation((prop: string) =>
      prop === AppSystemProp.DB_TYPE ? 'SQLITE3' : undefined,
    );

    expect(() => validateOAuthConfiguration()).toThrow('PostgreSQL');
  });
});
