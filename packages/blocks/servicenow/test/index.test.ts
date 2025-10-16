import { servicenow } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(servicenow.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'servicenow',
      authProviderDisplayName: 'ServiceNow',
      authProviderLogoUrl: 'https://static.openops.com/blocks/servicenow.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(servicenow.actions()).length).toBe(6);
    const actions = servicenow.actions();
    expect(actions).toMatchObject({
      list_records: {
        name: 'list_records',
        requireAuth: true,
      },
      get_record: {
        name: 'get_record',
        requireAuth: true,
      },
      create_record: {
        name: 'create_record',
        requireAuth: true,
      },
      update_record: {
        name: 'update_record',
        requireAuth: true,
      },
      delete_record: {
        name: 'delete_record',
        requireAuth: true,
      },
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
