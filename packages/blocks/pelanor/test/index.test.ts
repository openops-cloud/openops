import { pelanor } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(pelanor.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'pelanor',
      authProviderDisplayName: 'Pelanor',
      authProviderLogoUrl: '/blocks/pelanor.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(pelanor.actions()).length).toBe(1);
    expect(pelanor.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
