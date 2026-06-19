import { stepTestOutputCache } from '../data-selector-cache';
import { MentionTreeNode } from '../data-selector-utils';
import { expandOrCollapseNodesOnSearch } from '../expand-or-collapse-on-search';

describe('expandOrCollapseNodesOnSearch', () => {
  beforeEach(() => {
    stepTestOutputCache.clearAll();
  });

  const tree: MentionTreeNode[] = [
    {
      key: 'root',
      data: { propertyPath: 'root', displayName: 'Root' },
      children: [
        {
          key: 'child1',
          data: { propertyPath: 'root.child1', displayName: 'Child 1' },
          children: [
            {
              key: 'grandchild1',
              data: {
                propertyPath: 'root.child1.grandchild1',
                displayName: 'Grandchild 1',
              },
              children: undefined,
            },
          ],
        },
        {
          key: 'child2',
          data: { propertyPath: 'root.child2', displayName: 'Child 2' },
          children: undefined,
        },
      ],
    },
  ];

  it('expands all nodes at depth 0 and 1 when searchTerm is present', () => {
    expandOrCollapseNodesOnSearch(tree, 'search');
    expect(stepTestOutputCache.getExpanded('root')).toBe(true);
    expect(stepTestOutputCache.getExpanded('child1')).toBe(true);
    expect(stepTestOutputCache.getExpanded('child2')).toBe(true);
    // grandchild1 is at depth 2, should not be expanded
    expect(stepTestOutputCache.getExpanded('grandchild1')).toBe(false);
  });

  it('handles an empty mentions array without throwing', () => {
    expect(() => expandOrCollapseNodesOnSearch([], 'search')).not.toThrow();
  });

  it('handles a flat tree with no children without throwing', () => {
    const flatTree: MentionTreeNode[] = [
      {
        key: 'leaf1',
        data: { propertyPath: 'leaf1', displayName: 'Leaf 1', value: 'a' },
      },
      {
        key: 'leaf2',
        data: { propertyPath: 'leaf2', displayName: 'Leaf 2', value: 'b' },
      },
    ];
    expect(() =>
      expandOrCollapseNodesOnSearch(flatTree, 'search'),
    ).not.toThrow();
    expect(stepTestOutputCache.getExpanded('leaf1')).toBe(true);
    expect(stepTestOutputCache.getExpanded('leaf2')).toBe(true);
  });

  it('collapses all nodes when searchTerm is empty', () => {
    stepTestOutputCache.setExpanded('root', true);
    stepTestOutputCache.setExpanded('child1', true);
    stepTestOutputCache.setExpanded('child2', true);
    stepTestOutputCache.setExpanded('grandchild1', true);
    expandOrCollapseNodesOnSearch(tree, '');
    expect(stepTestOutputCache.getExpanded('root')).toBe(false);
    expect(stepTestOutputCache.getExpanded('child1')).toBe(false);
    expect(stepTestOutputCache.getExpanded('grandchild1')).toBe(false);
    expect(stepTestOutputCache.getExpanded('child2')).toBe(false);
  });
});
