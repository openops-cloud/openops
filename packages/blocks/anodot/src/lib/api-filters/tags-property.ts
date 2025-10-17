import { Property } from '@openops/blocks-framework';
import { booleanProperty, operatorProperty } from './property-helpers';

export function tagsProperty(
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
            `(${propertyName}) Negate condition`,
            '',
            false,
            'false',
          ),

          tag: Property.LongText({
            displayName: `(${propertyName}) Tag`,
            description: '',
            required: true,
          }),

          eq: Property.Array({
            displayName: `(${propertyName}) Equal values`,
            description: 'List of values ​​to be checked for equality.',
            required: false,
          }),

          like: Property.Array({
            displayName: `(${propertyName}) Like values`,
            description: 'List of values ​​​​to check if they are like.',
            required: false,
          }),

          operator: operatorProperty(`(${propertyName}) Operator`, ''),
        };
      },
    }),
  };
}
