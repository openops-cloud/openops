import { Property } from '@openops/blocks-framework';

export function statusProperty() {
  return Property.StaticDropdown({
    displayName: 'Status',
    description: 'Define what status of recommendations should be displayed',
    options: {
      options: statusFilters,
    },
    required: true,
  });
}

const statusFilters = [
  { label: 'potential_savings', value: 'potential_savings' },
  { label: 'actual_savings', value: 'actual_savings' },
  {
    label: 'potential_and_actual_savings',
    value: 'potential_and_actual_savings',
  },
  { label: 'excluded', value: 'excluded' },
  { label: 'user_actions', value: 'user_actions' },
  { label: 'custom', value: 'custom' },
];
