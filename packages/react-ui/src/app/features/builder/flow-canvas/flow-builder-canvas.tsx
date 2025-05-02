import { getNodesBounds, useReactFlow } from '@xyflow/react';
import React, { useCallback, useMemo, useState } from 'react';

import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import {
  BelowFlowWidget,
  FlowCanvas,
  flowCanvasUtils,
  LoopStepPlaceHolder,
  ReturnLoopedgeButton,
  StepPlaceHolder,
} from '@openops/components/ui';
import { useBuilderStateContext } from '../builder-hooks';
import { RightSideBarType } from '../builder-types';
import { CanvasContextMenuWrapper } from './context-menu/context-menu-wrapper';
import { EdgeWithButton } from './edges/edge-with-button';
import { FlowDragLayer } from './flow-drag-layer';
import { BigButton } from './nodes/big-button';
import { WorkflowStepNode } from './nodes/step-node';
import { AboveFlowWidgets } from './widgets';

const edgeTypes = {
  apEdge: EdgeWithButton,
  apReturnEdge: ReturnLoopedgeButton,
};
const nodeTypes = {
  stepNode: WorkflowStepNode,
  placeholder: StepPlaceHolder,
  bigButton: BigButton,
  loopPlaceholder: LoopStepPlaceHolder,
};
const FlowBuilderCanvas = React.memo(
  ({ lefSideBarContainerWidth = 0 }: { lefSideBarContainerWidth?: number }) => {
    const { getNodes } = useReactFlow();
    const [flowVersion, selectStepByName, rightSidebar] =
      useBuilderStateContext((state) => [
        state.flowVersion,
        state.selectStepByName,
        state.rightSidebar,
      ]);

    // Memoize graph so it only recalculates when flowVersion changes
    const graph = useMemo(() => {
      const convertedGraph =
        flowCanvasUtils.convertFlowVersionToGraph(flowVersion);
      const previousNodes = getNodes();

      convertedGraph.nodes = convertedGraph.nodes.map((node) => {
        const previousNode = previousNodes.find((n) => n.id === node.id);
        if (previousNode) node.selected = previousNode.selected;
        return node;
      });

      return convertedGraph;
    }, [flowVersion, getNodes]);

    const graphHeight = useMemo(
      () => getNodesBounds(graph.nodes),
      [graph.nodes],
    );

    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

    const isSidebarOpen = rightSidebar === RightSideBarType.BLOCK_SETTINGS;
    const setSelectedStep = useCallback(
      (stepName: string) => {
        if (selectStepByName) {
          selectStepByName(stepName, isSidebarOpen);
        }
      },
      [selectStepByName, isSidebarOpen],
    );

    const onNodeDrag = useCallback(
      (x: number, y: number) => {
        setCursorPosition({ x, y });
      },
      [setCursorPosition],
    );

    return (
      <div className="size-full relative overflow-hidden bg-editorBackground">
        <FlowDragLayer
          cursorPosition={cursorPosition}
          lefSideBarContainerWidth={lefSideBarContainerWidth}
        >
          <FlowCanvas
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            topOffset={FLOW_CANVAS_Y_OFFESET}
            graph={graph}
            ContextMenu={CanvasContextMenuWrapper}
            selectStepByName={setSelectedStep}
            onNodeDrag={(event) => {
              onNodeDrag(event.clientX, event.clientY);
            }}
          >
            <AboveFlowWidgets></AboveFlowWidgets>
            <BelowFlowWidget graphHeight={graphHeight.height}></BelowFlowWidget>
          </FlowCanvas>
        </FlowDragLayer>
      </div>
    );
  },
);

FlowBuilderCanvas.displayName = 'FlowCanvasWrapper';
export { FlowBuilderCanvas };
