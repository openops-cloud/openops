import { stepTestOutputCache } from './data-selector-cache';
import { MentionTreeNode } from './data-selector-utils';

/**
 * Expands or collapses nodes in the mention tree based on the search term.
 * @param mentions The mention tree nodes to operate on
 * @param searchTerm The current search term
 * @param setForceRerender Function to force a rerender
 */
export function expandOrCollapseNodesOnSearch(
  mentions: MentionTreeNode[],
  searchTerm: string,
  setForceRerender: (fn: (v: number) => number) => void,
) {
  if (searchTerm) {
    // Expand all nodes at depth 0 and 1
    const expandNodes = (nodes: MentionTreeNode[], depth: number) => {
      nodes.forEach((node) => {
        if (depth <= 1) {
          stepTestOutputCache.setExpanded(node.key, true);
        }
        if (node.children) {
          expandNodes(node.children, depth + 1);
        }
      });
    };
    expandNodes(mentions, 0);
  } else {
    // Collapse all nodes
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
  setForceRerender((v) => v + 1);
}
