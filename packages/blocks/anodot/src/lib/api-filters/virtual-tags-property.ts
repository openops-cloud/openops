import { Property } from '@openops/blocks-framework';

export function virtualTagsProperty() {
  return {
    useVirtualTag: Property.Checkbox({
      displayName: 'Filter by Virtual Tags',
      required: false,
    }),
    virtualTag: Property.DynamicProperties({
      displayName: 'Virtual Tag Filters',
      description: 'Each virtual tag represents a collection of custom tags',
      required: true,
      refreshers: ['useVirtualTag'],
      props: async ({ useVirtualTag }): Promise<{ [key: string]: any }> => {
        if (!useVirtualTag) {
          return {};
        }

        return {
          uuid: Property.LongText({
            displayName: '(virtual Tag) Uuid',
            description: 'UUID of the virtual tag to filter by',
            required: true,
          }),

          eq: Property.Array({
            displayName: '(virtual Tag) Equal Values',
            description: 'List of values ​​to be checked for equality',
            required: false,
          }),

          like: Property.Array({
            displayName: '(virtual Tag) Like Values',
            description: 'List of values ​​​​to check if they are like',
            required: false,
          }),
        };
      },
    }),
  };
}
