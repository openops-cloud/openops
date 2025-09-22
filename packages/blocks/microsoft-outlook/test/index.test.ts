import { microsoftOutlook } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(microsoftOutlook.auth).toMatchObject({
      type: 'OAUTH2',
      required: true,
      authProviderKey: 'microsoft-outlook',
      authProviderDisplayName: 'Microsoft-outlook',
      authProviderLogoUrl:
        'https://static.openops.com/blocks/microsoft-outlook.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(microsoftOutlook.actions()).length).toBe(1);
    expect(microsoftOutlook.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
