import { servicenow } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(servicenow.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'servicenow',
      authProviderDisplayName: 'ServiceNow',
      authProviderLogoUrl: '/blocks/servicenow.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(servicenow.actions()).length).toBe(8);
    const actions = servicenow.actions();
    expect(actions).toMatchObject({
      get_records: {
        name: 'get_records',
        requireAuth: true,
      },
      get_record: {
        name: 'get_record',
        requireAuth: true,
      },
      upsert_record: {
        name: 'upsert_record',
        requireAuth: true,
      },
      delete_record: {
        name: 'delete_record',
        requireAuth: true,
      },
      get_requests: {
        name: 'get_requests',
        requireAuth: true,
      },
      upsert_request: {
        name: 'upsert_request',
        requireAuth: true,
      },
      delete_request: {
        name: 'delete_request',
        requireAuth: true,
      },
      custom_api_call: {
        name: 'custom_api_call',
        requireAuth: true,
      },
    });
  });
});
