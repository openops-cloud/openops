import { Property } from '@openops/blocks-framework';
import { dateProperty } from './property-helpers';

export function openedRecommendationsProperty() {
  return Property.DynamicProperties({
    displayName: 'Date Filters for Open Recommendations',
    description: 'Filter open recommendations by date range',
    required: true,
    refreshers: [],
    props: async (): Promise<{ [key: string]: any }> => {
      return {
        from: dateProperty(
          '(Opened recommendations creation date) From',
          'Start date (Format: yyyy-MM-dd)',
        ),
        to: dateProperty(
          '(Opened recommendations creation date) To',
          'End date (Format: yyyy-MM-dd)',
        ),
      };
    },
  });
}
