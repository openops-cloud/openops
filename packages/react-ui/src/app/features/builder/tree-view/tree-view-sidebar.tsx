import { BuilderTreeView, ScrollArea } from '@openops/components/ui';
import { useCallback, useMemo } from 'react';

import { flowHelper } from '@openops/shared';

import { useBuilderStateContext } from '../builder-hooks';
import { LeftSideBarType } from '../builder-types';
import { useCenterWorkflowViewOntoStep } from '../hooks/center-workflow-view-onto-step';

import { mapStepsToTreeView } from './utils';

const TreeViewSideBar = () => {
  const [flowVersion, setLeftSidebar, selectStepByName] =
    useBuilderStateContext((state) => [
      state.flowVersion,
      state.setLeftSidebar,
      state.selectStepByName,
      state.removeStepSelection,
    ]);

  const centerWorkflowViewOntoStep = useCenterWorkflowViewOntoStep();

  const steps = flowHelper.getAllStepsAtFirstLevel(flowVersion.trigger);

  const treeViewNode = useMemo(
    () => mapStepsToTreeView('root', steps),
    [steps],
  );

  const onCloseTreeView = useCallback(() => {
    setLeftSidebar(LeftSideBarType.NONE);
  }, [setLeftSidebar]);

  const onSelect = useCallback(
    (focusNodeId: string, selectNodeId: string) => {
      const focusCanvasNode = () => {
        centerWorkflowViewOntoStep(focusNodeId);
      };

      selectStepByName(selectNodeId, focusNodeId === selectNodeId);
      focusCanvasNode();
    },
    [centerWorkflowViewOntoStep, selectStepByName],
  );

  return (
    <ScrollArea className="h-full">
      <BuilderTreeView
        treeNode={treeViewNode}
        onSelect={onSelect}
        onClose={onCloseTreeView}
      />
    </ScrollArea>
  );
};

TreeViewSideBar.displayName = 'TreeViewSideBar';
export { TreeViewSideBar };
