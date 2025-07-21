import { Property } from '@openops/blocks-framework';
import recommendationTypes from './assets/recommendation-types.json';

export function getPredefinedRecommendationsDropdownProperty() {
  return Property.StaticMultiSelectDropdown({
    displayName: 'Recommendation',
    description: 'The type of recommendations to fetch',
    options: {
      disabled: false,
      options: Object.entries(recommendationTypes)
        .map(([label, value]) => ({
          label,
          value,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
    required: false,
  });
}
