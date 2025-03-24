import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { getItemsAsArray } from '../utils';

export const groupByAction = createAction({
  auth: BlockAuth.None(),
  name: 'group_by_action',
  description: 'Group items by a given key',
  displayName: 'Group By',
  props: {
    listItems: Property.LongText({
      displayName: 'Items',
      description: `A list of items to group`,
      required: true,
    }),
    keyName: Property.ShortText({
      displayName: 'Property Key',
      description: 'The property to group by',
      required: true,
    }),
  },

  async run(context) {
    const listItems = getItemsAsArray(context.propsValue.listItems) as any[];

    return groupItemsByKey(listItems, context.propsValue.keyName);
  },
});

function groupItemsByKey(items: any[], groupKey: string): any[][] {
  return Object.values(
    items.reduce((groupedItems, currentItem) => {
      if (groupKey in currentItem) {
        const keyValue = currentItem[groupKey];
        groupedItems[keyValue] = groupedItems[keyValue] || [];
        groupedItems[keyValue].push(currentItem);
      }
      return groupedItems;
    }, {} as Record<string, any[]>),
  );
}
