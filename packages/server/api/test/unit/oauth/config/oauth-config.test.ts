import { AppSystemProp, system } from '@openops/server-shared';
import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';

describe('oauthConfig', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('strips trailing slashes from the issuer', () => {
    jest
      .spyOn(system, 'getOrThrow')
      .mockReturnValue('https://ops.example.com/api/');

    expect(oauthConfig.getIssuerUrl()).toBe('https://ops.example.com/api');
  });

  it('uses the issuer as the api audience', () => {
    jest
      .spyOn(system, 'getOrThrow')
      .mockReturnValue('https://ops.example.com/api');

    expect(oauthConfig.getApiAudience()).toBe('https://ops.example.com/api');
  });

  it('normalizes the mcp resource url and returns undefined when unset', () => {
    const getSpy = jest.spyOn(system, 'get');

    getSpy.mockReturnValue('https://ops.example.com/mcp/');
    expect(oauthConfig.getMcpResourceUrl()).toBe('https://ops.example.com/mcp');

    getSpy.mockReturnValue(undefined);
    expect(oauthConfig.getMcpResourceUrl()).toBeUndefined();
  });

  it('reads each TTL from its own setting', () => {
    const getNumber = jest
      .spyOn(system, 'getNumberOrThrow')
      .mockReturnValue(42);

    expect(oauthConfig.getAccessTokenTtlSeconds()).toBe(42);
    expect(getNumber).toHaveBeenLastCalledWith(
      AppSystemProp.OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    );

    expect(oauthConfig.getRefreshTokenTtlDays()).toBe(42);
    expect(getNumber).toHaveBeenLastCalledWith(
      AppSystemProp.OAUTH_REFRESH_TOKEN_TTL_DAYS,
    );

    expect(oauthConfig.getExchangeTokenTtlSeconds()).toBe(42);
    expect(getNumber).toHaveBeenLastCalledWith(
      AppSystemProp.OAUTH_EXCHANGE_TOKEN_TTL_SECONDS,
    );
  });

  it('is disabled unless explicitly enabled', () => {
    // Driven through the mock, not the ambient environment: a local .env sets this, and
    // the default when nothing does is what is under test.
    const getBoolean = jest.spyOn(system, 'getBoolean');

    getBoolean.mockReturnValue(undefined);
    expect(oauthConfig.isEnabled()).toBe(false);

    getBoolean.mockReturnValue(false);
    expect(oauthConfig.isEnabled()).toBe(false);

    getBoolean.mockReturnValue(true);
    expect(oauthConfig.isEnabled()).toBe(true);
    expect(getBoolean).toHaveBeenLastCalledWith(AppSystemProp.OAUTH_ENABLED);
  });
});
