import { ternary } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(ternary.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'Ternary',
      authProviderDisplayName: 'Ternary',
      authProviderLogoUrl: 'https://static.openops.com/blocks/ternary.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(ternary.actions()).length).toBe(3);
    expect(ternary.actions()).toMatchObject({
      get_data_integrations: {
        name: 'get_data_integrations',
        requireAuth: true,
      },
      get_budgets: {
        name: 'get_budgets',
        requireAuth: true,
      },
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
