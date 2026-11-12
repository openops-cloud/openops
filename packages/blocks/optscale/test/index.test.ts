import { optscale } from '../src/index';

const expectedActions: Record<string, boolean> = {
  optscale_get_organizations: false,
  optscale_get_data_sources: false,
  optscale_get_recommendations: false,
  optscale_get_resource: false,
  optscale_get_expenses: false,
  optscale_get_expenses_breakdown: false,
  optscale_get_anomalies: false,
  optscale_get_pools: false,
  optscale_get_employees: false,
  optscale_update_recommendation_status: true,
  optscale_assign_resource: true,
  optscale_set_pool_budget: true,
  optscale_custom_api_call: true,
};

describe('block declaration tests', () => {
  test('should return block with correct metadata', () => {
    expect(optscale).toMatchObject({
      displayName: 'OptScale',
      logoUrl: '/blocks/optscale.svg',
      minimumSupportedRelease: '0.20.0',
      categories: ['FINOPS'],
    });
  });

  test('should return block with correct authentication', () => {
    expect(optscale.auth).toMatchObject({
      type: 'CUSTOM_AUTH',
      required: true,
      authProviderKey: 'OptScale',
      props: {
        baseUrl: { required: true, type: 'SHORT_TEXT' },
        email: { required: true, type: 'SHORT_TEXT' },
        password: { required: true, type: 'SECRET_TEXT' },
      },
    });
  });

  test('should return block with correct actions', () => {
    const actions = optscale.actions();

    expect(Object.keys(actions)).toHaveLength(13);
    for (const [name, isWriteAction] of Object.entries(expectedActions)) {
      expect(actions[name]).toMatchObject({
        name,
        requireAuth: true,
        isWriteAction,
      });
    }
  });
});
