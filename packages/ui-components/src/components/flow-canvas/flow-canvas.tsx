import {
  Background,
  EdgeTypes,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { ReactNode, useCallback, useRef } from 'react';
import { Graph } from '../../lib/flow-canvas-utils';
import { useCanvasContext } from './canvas-context';
import { useResizeCanvas } from './use-resize-canvas';

type FlowCanvasProps = {
  edgeTypes?: EdgeTypes;
  nodeTypes?: NodeTypes;
  graph?: Graph;
  topOffset?: number;
  allowCanvasPanning?: boolean;
  children?: ReactNode;
};

const SHIFT_KEY = 'Shift';

function getPanOnDrag(allowCanvasPanning: boolean, inGrabPanningMode: boolean) {
  if (allowCanvasPanning) {
    return inGrabPanningMode ? [0, 1] : [1];
  }
  return false;
}

const FlowCanvas = React.memo(
  ({
    edgeTypes,
    nodeTypes,
    graph,
    topOffset,
    allowCanvasPanning = true,
    children,
  }: FlowCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useResizeCanvas(containerRef);

    const onInit = useCallback(
      (reactFlow: ReactFlowInstance) => {
        reactFlow.fitView({
          nodes: reactFlow.getNodes().slice(0, 5),
          minZoom: 0.5,
          maxZoom: 1.2,
        });
        if (topOffset) {
          const { x, zoom } = reactFlow.getViewport();
          reactFlow.setViewport({ x, y: topOffset, zoom });
        }
      },
      [topOffset],
    );

    const { panningMode } = useCanvasContext();
    const inGrabPanningMode = panningMode === 'grab';

    const panOnDrag = getPanOnDrag(allowCanvasPanning, inGrabPanningMode);

    return (
      <div className="size-full bg-editorBackground" ref={containerRef}>
        {!!graph && (
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={graph.nodes}
            edgeTypes={edgeTypes}
            edges={graph.edges}
            draggable={false}
            edgesFocusable={false}
            elevateEdgesOnSelect={false}
            maxZoom={1.5}
            minZoom={0.5}
            panOnDrag={panOnDrag}
            zoomOnDoubleClick={false}
            panOnScroll={true}
            fitView={false}
            nodesConnectable={false}
            elementsSelectable={true}
            nodesDraggable={false}
            nodesFocusable={false}
            selectionKeyCode={inGrabPanningMode ? SHIFT_KEY : null}
            multiSelectionKeyCode={inGrabPanningMode ? SHIFT_KEY : null}
            selectionOnDrag={!inGrabPanningMode}
            proOptions={{
              hideAttribution: true,
            }}
            onInit={onInit}
          >
            <Background color="lightgray" />
            {children}
          </ReactFlow>
        )}
      </div>
    );
  },
);

FlowCanvas.displayName = 'FlowCanvas';
export { FlowCanvas, FlowCanvasProps };
