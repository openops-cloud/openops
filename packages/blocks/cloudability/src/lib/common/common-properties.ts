import { Property } from '@openops/blocks-framework';
import { Vendor, getRecommendationTypesByVendor } from '@openops/common';
import { CostBasis, Duration } from './recommendations-api';

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

export function getRecommendationDurationProperty() {
  return {
    duration: Property.Dropdown({
      displayName: 'Look-Back Period',
      description:
        'The look back period in days, used for calculating the recommendations.',
      required: true,
      defaultValue: Duration.TenDay,
      refreshers: ['vendor', 'recommendationType'],
      options: async ({ vendor, recommendationType }) => {
        if (!vendor || !recommendationType) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Select a vendor and recommendation type first',
          };
        }

        if (vendor === Vendor.AWS && recommendationType === 's3') {
          return {
            disabled: false,
            options: [{ label: 'Last 30 Days', value: Duration.ThirtyDay }],
          };
        }

        return {
          disabled: false,
          options: [
            { label: 'Last 10 Days', value: Duration.TenDay },
            { label: 'Last 30 Days', value: Duration.ThirtyDay },
          ],
        };
      },
    }),
  };
}

export function getCostBasisProperty() {
  return {
    basis: Property.Dropdown({
      displayName: 'Cost Basis',
      description: 'The cost basis for the recommendations.',
      required: true,
      defaultValue: CostBasis.OnDemand,
      refreshers: ['vendor', 'recommendationType'],
      options: async ({ vendor, recommendationType }) => {
        if (!vendor || !recommendationType) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Select a vendor and recommendation type first',
          };
        }

        if (vendor === Vendor.AWS && recommendationType === 'redshift') {
          return {
            disabled: true,
            options: [],
            placeholder: 'Cost basis is not available for AWS Redshift',
          };
        }

        return {
          disabled: false,
          options: [
            { label: 'On-Demand', value: CostBasis.OnDemand },
            { label: 'Effective', value: CostBasis.Effective },
          ],
        };
      },
    }),
  };
}
