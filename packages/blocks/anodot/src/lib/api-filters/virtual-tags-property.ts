import { Property } from '@openops/blocks-framework';

export function virtualTagsProperty() {
  return {
    useVirtualTag: Property.Checkbox({
      displayName: 'Filter by virtual tags',
      required: false,
    }),
    virtualTag: Property.DynamicProperties({
      displayName: 'Virtual tag filters',
      description: 'Each virtual tag represents a collection of custom tags.',
      required: true,
      refreshers: ['useVirtualTag'],
      props: async ({ useVirtualTag }): Promise<{ [key: string]: any }> => {
        if (!useVirtualTag) {
          return {};
        }

        return {
          uuid: Property.LongText({
            displayName: '(Virtual tag) uuid',
            description: '',
            required: true,
          }),

          eq: Property.Array({
            displayName: '(Virtual tag) Equal values',
            description: 'List of values ​​to be checked for equality.',
            required: false,
          }),

          like: Property.Array({
            displayName: '(Virtual tag) Like values',
            description: 'List of values ​​​​to check if they are like.',
            required: false,
          }),
        };
      },
    }),
  };
}
