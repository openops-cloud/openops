import { WorkflowNode } from '@openops/components/ui';
import { flowHelper } from '@openops/shared';
import { OnSelectionChangeParams, useStoreApi } from '@xyflow/react';
import { cloneDeep } from 'lodash-es';
import { useCallback, useRef } from 'react';
import { useBuilderStateContext } from '../../builder-hooks';

export const useCanvasSelection = () => {
  const selectionRef = useRef<WorkflowNode[]>([]);
  const state = useStoreApi().getState();
  const [flowVersion] = useBuilderStateContext((state) => [state.flowVersion]);

  const onSelectionChange = (ev: OnSelectionChangeParams) => {
    if (ev.nodes.length) {
      selectionRef.current = ev.nodes as WorkflowNode[];
    }
  };

  const onSelectionEnd = useCallback(() => {
    const firstStep = selectionRef.current[0]?.data.step;
    if (!firstStep) return;

    const workflowTopLevelActions =
      flowHelper.getAllStepsAtFirstLevel(firstStep);
    if (!workflowTopLevelActions.length) return;

    let lastTopLevelSelectedActionIndex = -1;

    for (let i = selectionRef.current.length - 1; i >= 0; i--) {
      lastTopLevelSelectedActionIndex = workflowTopLevelActions.findIndex(
        (action) => action.name === selectionRef.current[i].data.step?.name,
      );
      if (lastTopLevelSelectedActionIndex !== -1) break;
    }

    const selectedActions =
      lastTopLevelSelectedActionIndex !== -1
        ? workflowTopLevelActions.slice(0, lastTopLevelSelectedActionIndex + 1)
        : workflowTopLevelActions;

    if (!selectedActions.length) return;

    const firstStepInSelection = flowHelper.truncateFlow(
      cloneDeep(selectedActions[0]),
      selectedActions[selectedActions.length - 1].name,
    );

    const allSelectedStepNames = flowHelper
      .getAllSteps(firstStepInSelection)
      .map((step) => step.name);

    console.log(allSelectedStepNames);
    state.addSelectedNodes(allSelectedStepNames);
  }, [flowVersion, state]);

  return { onSelectionChange, onSelectionEnd };
};
