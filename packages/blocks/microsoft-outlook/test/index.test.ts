import { microsoftOutlook } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(microsoftOutlook.auth).toMatchObject({
      type: 'OAUTH2',
      required: true,
      authProviderKey: 'Microsoft_Outlook',
      authProviderDisplayName: 'Microsoft Outlook',
      authProviderLogoUrl:
        '/blocks/microsoft-outlook.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(microsoftOutlook.actions()).length).toBe(6);
    expect(microsoftOutlook.actions()).toHaveProperty('custom_api_call');

    const actions = microsoftOutlook.actions();
    Object.values(actions).forEach((action) => {
      expect(action).toHaveProperty('requireAuth', true);
    });
  });
});
