import { cloudability } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudability.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'cloudability',
      authProviderDisplayName: 'Cloudability',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudability.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudability.actions()).length).toBe(4);
    expect(cloudability.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
      cloudability_get_recommendations: {
        name: 'cloudability_get_recommendations',
        requireAuth: true,
      },
      cloudability_snooze_recommendations: {
        name: 'cloudability_snooze_recommendations',
        requireAuth: true,
      },
      cloudability_unsnooze_recommendations: {
        name: 'cloudability_unsnooze_recommendations',
        requireAuth: true,
      },
    });
  });
});
