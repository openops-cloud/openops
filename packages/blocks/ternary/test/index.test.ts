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
    expect(Object.keys(ternary.actions()).length).toBe(2);
    expect(ternary.actions()).toMatchObject({
      get_data_integrations: {
        name: 'get_data_integrations',
        requireAuth: true,
      },
      get_budgets: {
        name: 'get_budgets',
        requireAuth: true,
      },
    });
  });
});
