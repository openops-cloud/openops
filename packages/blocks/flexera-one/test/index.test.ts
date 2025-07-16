import { flexeraOne } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(flexeraOne.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'flexera-one',
      authProviderDisplayName: 'Flexera-one',
      authProviderLogoUrl: 'https://static.openops.com/blocks/flexera-one.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(flexeraOne.actions()).length).toBe(1);
    expect(flexeraOne.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
