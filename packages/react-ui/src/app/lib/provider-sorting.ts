type SortBySelectabilityOptions<T> = {
  isSelectable: (item: T) => boolean;
  isConnected: (item: T) => boolean;
};

export function sortBySelectability<T>(
  items: readonly T[],
  { isSelectable, isConnected }: SortBySelectabilityOptions<T>,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      selectable: isSelectable(item),
      connected: isConnected(item),
    }))
    .sort((a, b) => {
      if (a.selectable !== b.selectable) {
        return a.selectable ? -1 : 1;
      }

      if (a.selectable && a.connected !== b.connected) {
        return a.connected ? -1 : 1;
      }

      return a.index - b.index;
    })
    .map(({ item }) => item);
}
