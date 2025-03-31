import { getNodesBounds, useReactFlow } from '@xyflow/react';
import React, { useCallback, useState } from 'react';

import { FLOW_CANVAS_Y_OFFESET } from '@/app/constants/flow-canvas';
import {
  BelowFlowWidget,
  FlowCanvas,
  flowCanvasUtils,
  LoopStepPlaceHolder,
  ReturnLoopedgeButton,
  StepPlaceHolder,
} from '@openops/components/ui';
import { RightSideBarType, useBuilderStateContext } from '../builder-hooks';
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
    const [graph, graphHeight, selectStepByName, rightSidebar] =
      useBuilderStateContext((state) => {
        const previousNodes = getNodes();
        const graph = flowCanvasUtils.convertFlowVersionToGraph(
          state.flowVersion,
        );
        graph.nodes = graph.nodes.map((node) => {
          const previousNode = previousNodes.find((n) => n.id === node.id);

          if (previousNode) {
            node.selected = previousNode.selected;
          }
          return node;
        });
        return [
          graph,
          getNodesBounds(graph.nodes),
          state.selectStepByName,
          state.rightSidebar,
        ];
      });
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
