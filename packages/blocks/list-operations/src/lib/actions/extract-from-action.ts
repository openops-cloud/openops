import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { getItemsAsArray } from '../utils';

export const extractFromListAction = createAction({
  auth: BlockAuth.None(),
  name: 'extract_from_list_action',
  description: 'Extract items from a list with a given key',
  displayName: 'Extract From List',
  props: {
    listItems: Property.LongText({
      displayName: 'Items',
      description: `A list of items to extract from`,
      required: true,
    }),
    keyName: Property.ShortText({
      displayName: 'Property Key',
      description: 'The property to extract',
      required: true,
    }),
  },

  async run(context) {
    const listItems = getItemsAsArray(context.propsValue.listItems) as any[];

    return listItems.map((item) => {
      if (!(context.propsValue.keyName in item)) {
        throw new Error(
          `Item does not have property: ${context.propsValue.keyName}`,
        );
      }

      return item[context.propsValue.keyName];
    });
  },
});
