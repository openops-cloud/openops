import { cloudfix } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudfix.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'cloudfix',
      authProviderDisplayName: 'CloudFix',
      authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudfix.actions()).length).toBe(6);
    expect(cloudfix.actions()).toMatchObject({
      get_recommendations: {
        name: 'get_recommendations',
        requireAuth: true,
      },
      create_change_requests: {
        name: 'create_change_requests',
        requireAuth: true,
      },
      postpone_recommendations: {
        name: 'postpone_recommendations',
        requireAuth: true,
      },
      get_recommendations_summary: {
        name: 'get_recommendations_summary',
        requireAuth: true,
      },
      get_report: {
        name: 'get_report',
        requireAuth: true,
      },
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
