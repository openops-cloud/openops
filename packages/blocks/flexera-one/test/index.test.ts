import { flexera } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(flexera.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'Flexera-One',
      authProviderDisplayName: 'Flexera',
      authProviderLogoUrl: '/blocks/flexera.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(flexera.actions()).length).toBe(3);
    expect(flexera.actions()).toMatchObject({
      flexera_get_active_recommendations: {
        name: 'flexera_get_active_recommendations',
        requireAuth: true,
      },
      flexera_get_incident: {
        name: 'flexera_get_incident',
        requireAuth: true,
      },
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
