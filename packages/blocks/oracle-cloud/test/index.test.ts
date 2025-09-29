import { oracleCloud } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(oracleCloud.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'oracle-cloud',
      authProviderDisplayName: 'Oracle-cloud',
      authProviderLogoUrl: 'https://static.openops.com/blocks/oracle-cloud.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(oracleCloud.actions()).length).toBe(1);
    expect(oracleCloud.actions()).toMatchObject({
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
