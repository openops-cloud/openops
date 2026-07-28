import { system } from '@openops/server-shared';
import { oauthConfig } from '../../../src/app/oauth/oauth-config';

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

  it('reads TTLs from the configured defaults', () => {
    expect(oauthConfig.getAccessTokenTtlSeconds()).toBe(900);
    expect(oauthConfig.getRefreshTokenTtlDays()).toBe(30);
    expect(oauthConfig.getExchangeTokenTtlSeconds()).toBe(300);
  });

  it('is disabled unless explicitly enabled', () => {
    expect(oauthConfig.isEnabled()).toBe(false);

    jest.spyOn(system, 'getBoolean').mockReturnValue(true);
    expect(oauthConfig.isEnabled()).toBe(true);
  });
});
