import { getRecommendationsSummaryAction } from '../../src/lib/actions/get-recommendations-summary-action';

describe('getRecommendationsSummaryAction', () => {
  test('should create action with no properties', () => {
    expect(getRecommendationsSummaryAction.props).toEqual({});
  });

  test('should have correct action metadata', () => {
    expect(getRecommendationsSummaryAction.name).toBe(
      'cloudfix_get_recommendations_summary',
    );
    expect(getRecommendationsSummaryAction.displayName).toBe(
      'Get Recommendations Summary',
    );
    expect(getRecommendationsSummaryAction.description).toBe(
      'Get a summary of recommendations.',
    );
    expect(getRecommendationsSummaryAction.requireAuth).toBe(true);
  });
});
