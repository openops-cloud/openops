import { Property } from '@openops/blocks-framework';
import { booleanProperty } from './property-helpers';

export function listFilterProperty(
  toggleName: string,
  toggleDisplayName: string,
  propertyName: string,
  displayName: string,
  description: string,
) {
  return {
    [toggleName]: Property.Checkbox({
      displayName: toggleDisplayName,
      required: false,
    }),
    [propertyName]: Property.DynamicProperties({
      displayName: displayName,
      description: description,
      required: true,
      refreshers: [toggleName],
      props: async (props): Promise<{ [key: string]: any }> => {
        if (!props[toggleName]) {
          return {};
        }

        return {
          negate: booleanProperty(
            `(${displayName}) Exclusion condition`,
            'Determines whether to check inclusion or exclusion.',
            true,
            'false',
          ),

          eq: Property.Array({
            displayName: `(${displayName}) Values`,
            description: 'List of values ​​to be checked.',
            required: true,
          }),
        };
      },
    }),
  };
}
