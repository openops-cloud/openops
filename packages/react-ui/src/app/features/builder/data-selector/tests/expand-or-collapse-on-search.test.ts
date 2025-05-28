import { stepTestOutputCache } from '../data-selector-cache';
import { MentionTreeNode } from '../data-selector-utils';
import { expandOrCollapseNodesOnSearch } from '../expand-or-collapse-on-search';

describe('expandOrCollapseNodesOnSearch', () => {
  let setForceRerender: jest.Mock;

  beforeEach(() => {
    stepTestOutputCache.clearAll();
    setForceRerender = jest.fn();
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
    expandOrCollapseNodesOnSearch(tree, 'search', setForceRerender);
    expect(stepTestOutputCache.getExpanded('root')).toBe(true);
    expect(stepTestOutputCache.getExpanded('child1')).toBe(true);
    expect(stepTestOutputCache.getExpanded('child2')).toBe(true);
    // grandchild1 is at depth 2, should not be expanded
    expect(stepTestOutputCache.getExpanded('grandchild1')).toBe(false);
    expect(setForceRerender).toHaveBeenCalledWith(expect.any(Function));
  });

  it('collapses all nodes when searchTerm is empty', () => {
    // First, expand everything to simulate previous state
    stepTestOutputCache.setExpanded('root', true);
    stepTestOutputCache.setExpanded('child1', true);
    stepTestOutputCache.setExpanded('child2', true);
    stepTestOutputCache.setExpanded('grandchild1', true);
    expandOrCollapseNodesOnSearch(tree, '', setForceRerender);
    expect(stepTestOutputCache.getExpanded('root')).toBe(false);
    expect(stepTestOutputCache.getExpanded('child1')).toBe(false);
    expect(stepTestOutputCache.getExpanded('grandchild1')).toBe(false);
    expect(stepTestOutputCache.getExpanded('child2')).toBe(false);
    expect(setForceRerender).toHaveBeenCalledWith(expect.any(Function));
  });
});
