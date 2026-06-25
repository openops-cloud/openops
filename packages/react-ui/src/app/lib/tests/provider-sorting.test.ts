import { sortBySelectability } from '../provider-sorting';

describe('sortBySelectability', () => {
  it('keeps original order when all items are equal', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    const sorted = sortBySelectability(items, {
      isSelectable: () => false,
      isConnected: () => false,
    });

    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('prioritizes selectable items first, then connected items among selectable', () => {
    const items = [{ id: 'aws' }, { id: 'azure' }, { id: 'gcp' }];

    const sorted = sortBySelectability(items, {
      isSelectable: (i) => i.id !== 'gcp',
      isConnected: (i) => i.id === 'azure',
    });

    expect(sorted.map((i) => i.id)).toEqual(['azure', 'aws', 'gcp']);
  });

  it('does not elevate connected items if they are not selectable', () => {
    const items = [{ id: 'aws' }, { id: 'azure' }, { id: 'gcp' }];

    const sorted = sortBySelectability(items, {
      isSelectable: (i) => i.id === 'aws',
      isConnected: (i) => i.id === 'gcp',
    });

    expect(sorted.map((i) => i.id)).toEqual(['aws', 'azure', 'gcp']);
  });
});
