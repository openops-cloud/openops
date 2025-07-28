import { Property, StaticDropdownProperty } from '@openops/blocks-framework';
import resourceTypes from '../api-filters/resource-types.json';

export function getResourceTypesProperty(): StaticDropdownProperty<
  string,
  true
> {
  return Property.StaticDropdown({
    displayName: 'Resource type',
    required: true,
    options: {
      options: resourceTypes.map((value) => {
        return {
          label: value,
          value: value,
        };
      }),
    },
  });
}
