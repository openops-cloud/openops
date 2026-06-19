import { stepTestOutputCache } from './data-selector-cache';
import { MentionTreeNode } from './data-selector-utils';

/**
 * Expands or collapses nodes in the mention tree based on the search term.
 * Cache subscribers (useSyncExternalStore) handle re-rendering automatically.
 */
export function expandOrCollapseNodesOnSearch(
  mentions: MentionTreeNode[],
  searchTerm: string,
) {
  if (searchTerm) {
    const expandNodes = (nodes: MentionTreeNode[], depth: number) => {
      if (depth > 1) {
        return;
      }
      nodes.forEach((node) => {
        stepTestOutputCache.setExpanded(node.key, true);
        if (node.children) {
          expandNodes(node.children, depth + 1);
        }
      });
    };
    expandNodes(mentions, 0);
  } else {
    const collapseNodes = (nodes: MentionTreeNode[]) => {
      nodes.forEach((node) => {
        stepTestOutputCache.setExpanded(node.key, false);
        if (node.children) {
          collapseNodes(node.children);
        }
      });
    };
    collapseNodes(mentions);
  }
}
