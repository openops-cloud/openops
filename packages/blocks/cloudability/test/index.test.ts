import { cloudability } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudability.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'cloudability',
      authProviderDisplayName: 'Cloudability',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudability.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudability.actions()).length).toBe(1);
    expect(cloudability.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
