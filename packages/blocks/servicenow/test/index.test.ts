import { servicenow } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(servicenow.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'servicenow',
      authProviderDisplayName: 'Servicenow',
      authProviderLogoUrl: 'https://static.openops.com/blocks/servicenow.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(servicenow.actions()).length).toBe(1);
    expect(servicenow.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
