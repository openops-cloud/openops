import { cloudhealth } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(cloudhealth.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'cloudhealth',
      authProviderDisplayName: 'CloudHealth',
      authProviderLogoUrl: '/blocks/cloudhealth.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(cloudhealth.actions()).length).toBe(10);

    expect(cloudhealth.actions()).toMatchObject({
      custom_rest_api_call: {
        name: 'custom_rest_api_call',
        requireAuth: true,
      },
      cloudhealth_get_recommendations: {
        name: 'cloudhealth_get_recommendations',
        requireAuth: true,
      },
      graphql_query: {
        name: 'graphql_query',
        requireAuth: true,
      },
      cloudhealth_search_assets: {
        name: 'cloudhealth_search_assets',
        requireAuth: true,
      },
      cloudhealth_tag_asset: {
        name: 'cloudhealth_tag_asset',
        requireAuth: true,
      },
      cloudhealth_get_aws_accounts: {
        name: 'cloudhealth_get_aws_accounts',
        requireAuth: true,
      },
      cloudhealth_get_azure_subscriptions: {
        name: 'cloudhealth_get_azure_subscriptions',
        requireAuth: true,
      },
      cloudhealth_get_gcp_projects: {
        name: 'cloudhealth_get_gcp_projects',
        requireAuth: true,
      },
      cloudhealth_remove_tag_asset: {
        name: 'cloudhealth_remove_tag_asset',
        requireAuth: true,
      },
      cloudhealth_get_asset_perspectives: {
        name: 'cloudhealth_get_asset_perspectives',
        requireAuth: true,
      },
    });
  });
});
