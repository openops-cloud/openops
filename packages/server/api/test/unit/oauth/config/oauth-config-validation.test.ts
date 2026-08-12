import { AppSystemProp, system } from '@openops/server-shared';
import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import { validateOAuthConfiguration } from '../../../../src/app/oauth/config/oauth-config-validation';

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
    // Equal audiences would have the resource server accept API tokens, silently voiding
    // the no-token-passthrough guarantee.
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

  it('accepts the TTLs this repository ships as defaults', () => {
    // Guards the bounds themselves: a range excluding the shipped defaults would fail
    // every boot while the assertions below still looked correct.
    expect(oauthConfig.getAccessTokenTtlSeconds()).toBe(900);
    expect(oauthConfig.getExchangeTokenTtlSeconds()).toBe(300);
    expect(oauthConfig.getRefreshTokenTtlDays()).toBe(30);
    expect(() => validateOAuthConfiguration()).not.toThrow();
  });

  it.each([
    [
      'getAccessTokenTtlSeconds',
      30,
      AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    ],
    [
      'getAccessTokenTtlSeconds',
      60 * 60 * 24 * 30,
      AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    ],
    [
      'getExchangeTokenTtlSeconds',
      30,
      AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    ],
    [
      'getExchangeTokenTtlSeconds',
      3600,
      AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    ],
    ['getRefreshTokenTtlDays', 0, AppSystemProp.OAUTH_REFRESH_TOKEN_TTL_DAYS],
    ['getRefreshTokenTtlDays', 365, AppSystemProp.OAUTH_REFRESH_TOKEN_TTL_DAYS],
  ] as const)(
    'refuses %s of %d, naming the property at fault',
    (getter, value, prop) => {
      jest.spyOn(oauthConfig, getter).mockReturnValue(value);

      // A wrong TTL boots a server that looks healthy while a guarantee is gone.
      expect(() => validateOAuthConfiguration()).toThrow(`OPS_${prop}`);
    },
  );

  it('refuses a fractional TTL rather than silently truncating it', () => {
    jest.spyOn(oauthConfig, 'getAccessTokenTtlSeconds').mockReturnValue(900.5);

    expect(() => validateOAuthConfiguration()).toThrow('whole number');
  });

  it('refuses to run on sqlite, where the migration is not registered', () => {
    (system.get as jest.Mock).mockImplementation((prop: string) =>
      prop === AppSystemProp.DB_TYPE ? 'SQLITE3' : undefined,
    );

    expect(() => validateOAuthConfiguration()).toThrow('PostgreSQL');
  });
});
