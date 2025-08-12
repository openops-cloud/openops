import { getPredefinedRecommendationsDropdownProperty } from '../../src/lib/api-filters/get-predefined-recommendation-property';

describe('getPredefinedRecommendationsDropdownProperty', () => {
  test('should return expected property', async () => {
    const result = getPredefinedRecommendationsDropdownProperty();

    expect(result).toMatchObject(
      expect.objectContaining({
        required: false,
        displayName: 'Recommendation',
        description: 'The type of recommendations to fetch',
        type: 'STATIC_MULTI_SELECT_DROPDOWN',
      }),
    );

    expect(result.options.options.length).toBe(85);
  });
});
