import { kion } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(kion.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'kion',
      authProviderDisplayName: 'Kion',
      authProviderLogoUrl: '/blocks/kion.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(kion.actions()).length).toBe(1);
    expect(kion.actions()).toMatchObject({
      custom_rest_api_call: {
        name: 'custom_rest_api_call',
        requireAuth: true,
      },
    });
  });
});
