import { WorkflowNode } from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { OnSelectionChangeParams, useStoreApi } from '@xyflow/react';
import { cloneDeep } from 'lodash-es';
import { useCallback, useRef } from 'react';

export const useCanvasSelection = () => {
  const selectionRef = useRef<WorkflowNode[]>([]);
  const state = useStoreApi().getState();

  const onSelectionChange = (selectionParamas: OnSelectionChangeParams) => {
    if (selectionParamas.nodes.length) {
      selectionRef.current = selectionParamas.nodes as WorkflowNode[];
    }
  };

  const onSelectionEnd = useCallback(() => {
    const firstStep = selectionRef.current[0]?.data.step;
    if (!firstStep) return;

    const topLevelSteps = flowHelper.getAllStepsAtFirstLevel(firstStep);
    if (!topLevelSteps.length) return;

    const lastSelectedIndex = selectionRef.current.reduceRight(
      (foundIndex, node, i) =>
        foundIndex === -1 &&
        topLevelSteps.some((step) => step.name === node.data.step?.name)
          ? i
          : foundIndex,
      -1,
    );

    const selectedSteps =
      lastSelectedIndex !== -1
        ? topLevelSteps.slice(0, lastSelectedIndex + 1)
        : topLevelSteps;

    if (!selectedSteps.length) return;

    const truncatedFlow = flowHelper.truncateFlow(
      cloneDeep(selectedSteps[0]),
      selectedSteps[selectedSteps.length - 1].name,
    );

    const selectedStepNames = flowHelper
      .getAllSteps(truncatedFlow)
      .map((step) => step.name);

    state.addSelectedNodes(selectedStepNames);
  }, [state]);

  return { onSelectionChange, onSelectionEnd };
};
