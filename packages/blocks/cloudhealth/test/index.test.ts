import { cloudhealth } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudhealth.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'cloudhealth',
      authProviderDisplayName: 'CloudHealth',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudhealth.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudhealth.actions()).length).toBe(2);
    expect(cloudhealth.actions()).toMatchObject({
      custom_rest_api_call: {
        name: 'custom_rest_api_call',
        requireAuth: true,
      },
      graphql_query: {
        name: 'graphql_query',
        requireAuth: true,
      },
    });
  });
});
