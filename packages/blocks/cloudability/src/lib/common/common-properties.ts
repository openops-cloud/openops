import { Property } from '@openops/blocks-framework';
import { Vendor, getRecommendationTypesByVendor } from '@openops/common';

export function getVendorsProperty() {
  return {
    vendor: Property.StaticDropdown({
      displayName: 'Vendor Type',
      description: 'The cloud vendor for which to fetch recommendations.',
      required: true,
      options: {
        options: Object.values(Vendor).map((v) => ({
          label: v,
          value: v,
        })),
      },
    }),
  };
}

export function getRecommendationTypesProperty() {
  return {
    recommendationType: Property.Dropdown({
      displayName: 'Recommendation Type',
      description: 'The type of recommendations to fetch.',
      required: true,
      refreshers: ['vendor'],
      options: async ({ vendor }) => {
        const recommendationTypes = getRecommendationTypesByVendor(
          vendor as Vendor,
        );

        if (!recommendationTypes?.length) {
          return {
            disabled: true,
            options: [],
            placeholder: 'No recommendations available for this vendor',
          };
        }

        return {
          disabled: false,
          options: recommendationTypes.map((type) => ({
            label: type.label,
            value: type.value,
          })),
        };
      },
    }),
  };
}
