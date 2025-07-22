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
        type: 'DROPDOWN',
      },
      sortOrder: {
        required: false,
        type: 'DROPDOWN',
      },
      includeParameters: {
        required: false,
        type: 'CHECKBOX',
      },
      status: {
        required: false,
        type: 'MULTI_SELECT_DROPDOWN',
      },
    });
  });

  test('should have correct action metadata', () => {
    expect(getRecommendationsAction.name).toBe('cloudfix_get_recommendations');
    expect(getRecommendationsAction.displayName).toBe('Get Recommendations');
    expect(getRecommendationsAction.description).toBe(
      'Get recommendations from Cloudfix with filtering and pagination options.',
    );
    expect(getRecommendationsAction.requireAuth).toBe(true);
  });

  test('should have correct sortBy options', () => {
    const sortByOptions = getRecommendationsAction.props.sortBy.options;
    expect(sortByOptions).toContain('scheduledAt');
    expect(sortByOptions).toContain('createdAt');
    expect(sortByOptions).toContain('updatedAt');
    expect(sortByOptions).toContain('priority');
  });

  test('should have correct sortOrder options', () => {
    const sortOrderOptions = getRecommendationsAction.props.sortOrder.options;
    expect(sortOrderOptions).toContain('ASC');
    expect(sortOrderOptions).toContain('DESC');
  });

  test('should have correct status options', () => {
    const statusOptions = getRecommendationsAction.props.status.options;
    expect(statusOptions).toContain('MANUAL_APPROVAL');
    expect(statusOptions).toContain('SUGGESTED');
    expect(statusOptions).toContain('SCHEDULED');
    expect(statusOptions).toContain('IN_PROGRESS');
    expect(statusOptions).toContain('COMPLETED');
    expect(statusOptions).toContain('FAILED');
    expect(statusOptions).toContain('CANCELLED');
  });
});
