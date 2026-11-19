import {
  getRecommendationCategory,
  getRecommendationTypeOptions,
  NON_DISMISSIBLE_RECOMMENDATION_TYPES,
  RECOMMENDATION_TYPES,
} from '../../src/lib/common/recommendation-types';

describe('recommendation types', () => {
  test('values are unique', () => {
    const values = RECOMMENDATION_TYPES.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
  });

  test('returns the category of a known type', () => {
    expect(getRecommendationCategory('rightsizing_instances')).toBe('cost');
    expect(getRecommendationCategory('s3_public_buckets')).toBe('security');
    expect(getRecommendationCategory('unknown')).toBeUndefined();
  });

  test('builds dropdown options', () => {
    expect(getRecommendationTypeOptions()).toContainEqual({
      label: 'Instance rightsizing',
      value: 'rightsizing_instances',
    });
    expect(getRecommendationTypeOptions()).toHaveLength(
      RECOMMENDATION_TYPES.length,
    );
  });

  test('non-dismissible types are known types', () => {
    for (const type of NON_DISMISSIBLE_RECOMMENDATION_TYPES) {
      expect(getRecommendationCategory(type)).toBeDefined();
    }
  });
});
