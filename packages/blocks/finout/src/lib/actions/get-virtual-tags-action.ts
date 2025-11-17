import { createAction, Property } from '@openops/blocks-framework';
import { finoutAuth } from '../auth';
import { getVirtualTags } from '../common/virtual-tags';

export const getVirtualTagValuesAction = createAction({
  name: 'finout_get_virtual_tags',
  displayName: 'Get Virtual Tag Values',
  description: 'Get virtual tags and their values',
  auth: finoutAuth,
  isWriteAction: false,
  props: {
    virtualTagIds: Property.MultiSelectDropdown({
      displayName: 'Virtual Tags',
      description:
        'Select virtual tags to retrieve. Leave empty to retrieve all.',
      refreshers: ['auth'],
      required: false,
      options: async ({ auth }: any) => {
        const tags = await getVirtualTags(auth);

        if (!tags || tags.length === 0) {
          return {
            disabled: true,
            options: [],
            placeholder: 'No virtual tags found.',
          };
        }
        return {
          disabled: false,
          options: tags.map((tag) => ({
            label: tag.name,
            value: tag.id,
          })),
        };
      },
    }),
  },
  async run(context) {
    const { virtualTagIds } = context.propsValue;

    const tags = await getVirtualTags(context.auth);
    const tagsWithPossibleValues = tags.map((tag) => {
      const values = tag.rules.map((rule) => rule.to);

      return {
        ...tag,
        values: values,
      };
    });

    if (virtualTagIds && virtualTagIds.length > 0) {
      return tagsWithPossibleValues.filter((tag) =>
        virtualTagIds.includes(tag.id),
      );
    }

    return tagsWithPossibleValues;
  },
});
