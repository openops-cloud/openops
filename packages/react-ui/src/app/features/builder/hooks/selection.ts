import { WorkflowNode } from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { useReactFlow } from '@xyflow/react';
import { useBuilderStateContext } from '../builder-hooks';

export const useSelection = () => {
  const { getNodes } = useReactFlow();
  const nodes = getNodes() as WorkflowNode[];

  const selectedNodes = nodes
    .filter((node) => node.selected)
    .reduce((acc, node) => {
      const name = node.data.step?.name;
      if (name !== undefined) {
        acc.push(name);
      }
      return acc;
    }, [] as string[]);

  const [flowVersion, selectedStep] = useBuilderStateContext((state) => [
    state.flowVersion,
    state.selectedStep,
  ]);

  const firstSelectedNode = flowHelper.getStep(flowVersion, selectedNodes[0]);
  const getStepDetails = (stepName: string | null) => {
    if (!stepName) return;
    return flowHelper.getStep(flowVersion, stepName);
  };

  return {
    selectedStep,
    selectedNodes,
    firstSelectedNode,
    getStepDetails,
  };
};
