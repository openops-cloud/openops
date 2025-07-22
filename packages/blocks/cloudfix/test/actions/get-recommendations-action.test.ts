import { getRecommendationsAction } from '../../src/lib/actions/get-recommendations-action';

describe('getRecommendationsAction', () => {
  test('should create action with correct properties', () => {
    expect(getRecommendationsAction.props).toMatchObject({
      finderFixerId: {
        required: false,
        type: 'SHORT_TEXT',
      },
      pageNumber: {
        required: false,
        type: 'NUMBER',
      },
      pageLimit: {
        required: false,
        type: 'NUMBER',
      },
      sortBy: {
        required: false,
        type: 'STATIC_DROPDOWN',
      },
      sortOrder: {
        required: false,
        type: 'STATIC_DROPDOWN',
      },
      includeParameters: {
        required: false,
        type: 'CHECKBOX',
      },
      status: {
        required: false,
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      },
    });
  });

  test('should have correct action metadata', () => {
    expect(getRecommendationsAction.name).toBe('cloudfix_get_recommendations');
    expect(getRecommendationsAction.displayName).toBe('Get Recommendations');
    expect(getRecommendationsAction.description).toBe(
      'Get recommendations from CloudFix with filtering and pagination options.',
    );
    expect(getRecommendationsAction.requireAuth).toBe(true);
  });

  test('should have correct sortBy options', () => {
    const sortByOptions = getRecommendationsAction.props.sortBy.options.options;
    expect(sortByOptions).toContainEqual({
      label: 'Scheduled At',
      value: 'scheduledAt',
    });
  });

  test('should have correct sortOrder options', () => {
    const sortOrderOptions =
      getRecommendationsAction.props.sortOrder.options.options;
    expect(sortOrderOptions).toContainEqual({
      label: 'Ascending',
      value: 'ASC',
    });
    expect(sortOrderOptions).toContainEqual({
      label: 'Descending',
      value: 'DESC',
    });
  });

  test('should have correct status options', () => {
    const statusOptions = getRecommendationsAction.props.status.options.options;
    expect(statusOptions).toContainEqual({
      label: 'Manual Approval',
      value: 'MANUAL_APPROVAL',
    });
    expect(statusOptions).toContainEqual({
      label: 'Suggested',
      value: 'SUGGESTED',
    });
    expect(statusOptions).toContainEqual({
      label: 'Scheduled',
      value: 'SCHEDULED',
    });
    expect(statusOptions).toContainEqual({
      label: 'In Progress',
      value: 'IN_PROGRESS',
    });
  });
});
