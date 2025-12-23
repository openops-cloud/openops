import { cloudzero } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudzero.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'cloudzero',
      authProviderDisplayName: 'CloudZero',
      authProviderLogoUrl: '/blocks/cloudzero.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudzero.actions()).length).toBe(1);
    expect(cloudzero.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
