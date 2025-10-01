import { nops } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(nops.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'nops',
      authProviderDisplayName: 'Nops',
      authProviderLogoUrl: 'https://static.openops.com/blocks/nops.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(nops.actions()).length).toBe(1);
    expect(nops.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });

  test('should have authMapping configured', () => {
    const actions = nops.actions();
    expect(actions.custom_api_call).toBeDefined();
  });
});
