import { isEmpty } from '@openops/shared';

export function getItemsAsArray(listItems: unknown): unknown[] {
  if (isEmpty(listItems)) {
    return [];
  }

  if (typeof listItems === 'string') {
    try {
      listItems = JSON.parse(listItems);
    } catch (error) {
      throw new Error(`Invalid JSON string provided for 'Items'`);
    }
  }

  if (!Array.isArray(listItems)) {
    throw new Error(`'Items' is not an array`);
  }

  return listItems;
}
