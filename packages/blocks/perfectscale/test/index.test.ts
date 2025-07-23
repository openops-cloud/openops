import { perfectscale } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(perfectscale.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'perfectscale',
      authProviderDisplayName: 'PerfectScale',
      authProviderLogoUrl: 'https://static.openops.com/blocks/perfectscale.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(perfectscale.actions()).length).toBe(1);
    expect(perfectscale.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
