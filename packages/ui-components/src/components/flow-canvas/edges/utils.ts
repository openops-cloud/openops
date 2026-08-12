import { Node } from '@xyflow/react';

import { SplitAction } from '@openops/shared';

type SplitActionNode = Omit<Node, 'data'> & {
  data: {
    step?: SplitAction;
    branchNodeId?: string;
  };
};

export const getSplitEdgeData = (
  sourceNodeId: string,
  targetNodeId: string,
  nodes: Node[],
) => {
  const splitParentNode: SplitActionNode | undefined = nodes.find(
    (node) => node.id === sourceNodeId,
  );
  const splitEdgeTargetNode = nodes.find((node) => node.id === targetNodeId);
  const branchNodeId = splitEdgeTargetNode?.data?.branchNodeId;

  const isDefaultBranch =
    splitParentNode?.data?.step?.settings?.defaultBranch === branchNodeId;

  const branchName =
    splitParentNode?.data?.step?.settings?.options?.find(
      (option) => option.id === branchNodeId,
    )?.name || '';

  return {
    branchName,
    isDefaultBranch,
  };
};

export const getBranchNodeId = (
  targetNodeId: string,
  nodes: Node[],
): string | undefined => {
  const splitEdgeTargetNode = nodes.find((node) => node.id === targetNodeId);
  const branchNodeId = splitEdgeTargetNode?.data?.branchNodeId as
    string | undefined;

  return branchNodeId;
};
