import { Property, StaticDropdownProperty } from '@openops/blocks-framework';
import caseTypes from '../api-filters/case-types.json';

export function getCaseTypesProperty(): StaticDropdownProperty<string, true> {
  return Property.StaticDropdown({
    displayName: 'Case type',
    description: '',
    required: true,
    options: {
      options: caseTypes.map((value) => {
        return {
          label: value,
          value: value,
        };
      }),
    },
  });
}
