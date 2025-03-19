import { getNodesBounds } from '@xyflow/react';
import React from 'react';

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
const FlowBuilderCanvas = React.memo(() => {
  const [allowCanvasPanning, graph, graphHeight] = useBuilderStateContext(
    (state) => {
      const graph = flowCanvasUtils.convertFlowVersionToGraph(
        state.flowVersion,
      );
      return [state.allowCanvasPanning, graph, getNodesBounds(graph.nodes)];
    },
  );

  return (
    <div className="size-full relative overflow-hidden bg-editorBackground">
      <FlowDragLayer>
        <FlowCanvas
          allowCanvasPanning={allowCanvasPanning}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          topOffset={FLOW_CANVAS_Y_OFFESET}
          graph={graph}
        >
          <AboveFlowWidgets></AboveFlowWidgets>
          <BelowFlowWidget graphHeight={graphHeight.height}></BelowFlowWidget>
        </FlowCanvas>
      </FlowDragLayer>
    </div>
  );
});

FlowBuilderCanvas.displayName = 'FlowCanvasWrapper';
export { FlowBuilderCanvas };
