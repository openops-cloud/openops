import { createChangeRequestsAction } from '../../src/lib/actions/create-change-requests-action';

describe('createChangeRequestsAction', () => {
  test('should create action with correct properties', () => {
    expect(createChangeRequestsAction.props).toMatchObject({
      recommendationIds: {
        required: true,
        type: 'ARRAY',
      },
      executeOnSchedule: {
        required: true,
        type: 'CHECKBOX',
      },
    });
  });

  test('should have correct action metadata', () => {
    expect(createChangeRequestsAction.name).toBe(
      'cloudfix_create_change_requests',
    );
    expect(createChangeRequestsAction.displayName).toBe(
      'Create Change Requests',
    );
    expect(createChangeRequestsAction.description).toBe(
      'Create change requests from recommendations.',
    );
    expect(createChangeRequestsAction.requireAuth).toBe(true);
  });

  test('should have correct array properties for recommendationIds', () => {
    const recommendationIdsProps =
      createChangeRequestsAction.props.recommendationIds.properties;
    expect(recommendationIdsProps).toMatchObject({
      recommendationId: {
        required: true,
        type: 'SHORT_TEXT',
      },
    });
  });

  test('should have correct executeOnSchedule default value', () => {
    expect(
      createChangeRequestsAction.props.executeOnSchedule.defaultValue,
    ).toBe(false);
  });
});
