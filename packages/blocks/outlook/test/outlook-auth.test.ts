import { microsoftAuth } from '../src/lib/common/outlook-auth';

describe('microsoftAuth', () => {
  it('should have correct OAuth2 configuration', () => {
    expect(microsoftAuth.authProviderKey).toBe('Microsoft_Teams');
    expect(microsoftAuth.authProviderDisplayName).toBe('Microsoft Teams');
    expect(microsoftAuth.authUrl).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );
    expect(microsoftAuth.tokenUrl).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    );
  });

  it('should have required scopes', () => {
    expect(microsoftAuth.scope).toContain('User.Read');
    expect(microsoftAuth.scope).toContain('Mail.Read');
    expect(microsoftAuth.scope).toContain('ChannelMessage.Send');
    expect(microsoftAuth.scope).toContain('ChatMessage.Send');
    expect(microsoftAuth.scope).toContain('offline_access');
  });
});
