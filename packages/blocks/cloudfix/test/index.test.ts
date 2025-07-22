import { cloudfix } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudfix.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'cloudfix',
      authProviderDisplayName: 'Cloudfix',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudfix.actions()).length).toBe(1);
    expect(cloudfix.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });

  test('should return block with correct display name', () => {
    expect(cloudfix.displayName).toEqual('CloudFix');
  });

  test('should return block with correct categories', () => {
    expect(cloudfix.categories).toContain('FINOPS');
  });
});
