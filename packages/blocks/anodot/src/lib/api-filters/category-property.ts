import { Property } from '@openops/blocks-framework';

export function categoryProperty() {
  return Property.StaticMultiSelectDropdown({
    displayName: 'Category Id',
    description: 'Get only recommendations from the selected category',
    required: false,
    options: {
      disabled: false,
      options: [
        { label: 'Right Sizing', value: 1 },
        { label: 'Commitments', value: 3 },
        { label: 'Terminate', value: 4 },
        { label: 'Unattached', value: 5 },
        { label: 'Generation Upgrade', value: 7 },
        { label: 'Other', value: 999999 },
      ],
    },
  });
}
