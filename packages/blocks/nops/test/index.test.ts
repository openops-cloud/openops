import { nops } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(nops.auth).toMatchObject({
      type: 'SECRET_TEXT',
      required: true,
      authProviderKey: 'nops',
      authProviderDisplayName: 'nOps',
      authProviderLogoUrl: 'https://static.openops.com/blocks/nops.png',
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(nops.actions()).length).toBe(2);
    expect(nops.actions()).toMatchObject({
      nops_get_cost_summary: {
        name: 'nops_get_cost_summary',
        requireAuth: true,
      },
      custom_rest_api_call: {
        name: 'custom_rest_api_call',
        requireAuth: true,
      },
    });
  });

  test('should have cost summary action configured', () => {
    const actions = nops.actions();
    expect(actions.nops_get_cost_summary).toBeDefined();
    expect(actions.nops_get_cost_summary.displayName).toBe('Get Cost Summary');
  });
});
