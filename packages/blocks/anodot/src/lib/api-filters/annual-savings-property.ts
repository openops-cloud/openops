import { Property } from '@openops/blocks-framework';

export function annualSavingsProperty() {
  return {
    useAnnualSavings: Property.Checkbox({
      displayName: 'Filter by Annual Savings',
      required: false,
    }),

    annualSavingsProperty: Property.DynamicProperties({
      displayName: 'Annual Savings Greater Than',
      description:
        'Only get recommendations where the annual savings are greater than',
      required: true,
      refreshers: ['useAnnualSavings'],
      props: async ({ useAnnualSavings }): Promise<{ [key: string]: any }> => {
        if (!useAnnualSavings) {
          return {};
        }

        return {
          annualSavingsMin: Property.Number({
            displayName: 'Annual Savings Greater Than',
            description:
              'Only get recommendations where the annual savings are greater than',
            required: true,
          }),
        };
      },
    }),
  };
}
