import { postponeRecommendationsAction } from '../../src/lib/actions/postpone-recommendations-action';

describe('postponeRecommendationsAction', () => {
  test('should create action with correct properties', () => {
    expect(postponeRecommendationsAction.props).toMatchObject({
      recommendationIds: {
        required: true,
        type: 'ARRAY',
      },
      postponeUntil: {
        required: true,
        type: 'DATE_TIME',
      },
      reason: {
        required: true,
        type: 'LONG_TEXT',
      },
    });
  });

  test('should have correct action metadata', () => {
    expect(postponeRecommendationsAction.name).toBe(
      'cloudfix_postpone_recommendations',
    );
    expect(postponeRecommendationsAction.displayName).toBe(
      'Postpone Recommendations',
    );
    expect(postponeRecommendationsAction.description).toBe(
      'Postpone recommendations until a specified date.',
    );
    expect(postponeRecommendationsAction.requireAuth).toBe(true);
  });

  test('should have correct array properties for recommendationIds', () => {
    const recommendationIdsProps =
      postponeRecommendationsAction.props.recommendationIds.properties;
    expect(recommendationIdsProps).toMatchObject({
      recommendationId: {
        required: true,
        type: 'SHORT_TEXT',
      },
    });
  });

  test('should have correct postponeUntil description', () => {
    expect(postponeRecommendationsAction.props.postponeUntil.description).toBe(
      'The date and time to postpone the recommendations until',
    );
  });

  test('should have correct reason description', () => {
    expect(postponeRecommendationsAction.props.reason.description).toBe(
      'The reason for postponing the recommendations',
    );
  });
});
