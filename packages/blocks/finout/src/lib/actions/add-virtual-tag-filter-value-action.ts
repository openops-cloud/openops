import { createAction, Property } from '@openops/blocks-framework';
import { finoutAuth } from '../auth';
import {
  getVirtualTagById,
  getVirtualTags,
  updateTag,
} from '../common/virtual-tags';

export const addVirtualTagFilterValueAction = createAction({
  name: 'finout_add_virtual_tag_filter_value',
  displayName: 'Add Value to Virtual Tag Filter',
  description: 'Add a value to an existing virtual tag filter',
  auth: finoutAuth,
  isWriteAction: true,
  props: {
    tagId: Property.Dropdown({
      displayName: 'Virtual Tag',
      description: 'Select a virtual tag to modify',
      refreshers: ['auth'],
      required: true,
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
    tagFilter: Property.Dropdown({
      displayName: 'Tag Filter',
      description: 'Select a virtual tag filter to modify',
      refreshers: ['auth', 'tagId'],
      required: true,
      options: async ({ auth, tagId }: any) => {
        const tag = await getVirtualTagById(auth, tagId);

        if (!tag) {
          return {
            disabled: true,
            options: [],
            placeholder: 'No virtual tag values found.',
          };
        }

        return {
          disabled: false,
          options: tag.rules.map((rule) => ({
            label: rule.to,
            value: rule.to,
          })),
        };
      },
    }),
    valueToAdd: Property.ShortText({
      displayName: 'Value to Add',
      description: 'The value to add to the virtual tag filter',
      required: true,
    }),
  },
  async run(context) {
    const { tagId, tagFilter, valueToAdd } = context.propsValue;

    const tag = await getVirtualTagById(context.auth, tagId);

    if (!tag) {
      throw new Error(`Virtual tag with ID ${tagId} not found.`);
    }

    const tagRule = tag.rules.find((rule) => rule.to === tagFilter);

    if (!tagRule) {
      throw new Error(
        `Tag filter "${tagFilter}" not found in virtual tag with ID ${tagId}.`,
      );
    }

    tagRule.filters.value.push(valueToAdd);

    const response = await updateTag(context.auth, tagId, tag);

    return response;
  },
});
