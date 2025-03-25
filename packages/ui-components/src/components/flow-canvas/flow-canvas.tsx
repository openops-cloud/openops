import {
  Background,
  EdgeTypes,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
  useStoreApi,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Edge, Graph, WorkflowNode } from '../../lib/flow-canvas-utils';
import { useCanvasContext } from './canvas-context';
import {
  InitialZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_SELECTION_RECT_CLASS_NAME,
  SHIFT_KEY,
  STEP_CONTEXT_MENU_ATTRIBUTE,
} from './constants';
import { ContextMenuType } from './types';
import { useResizeCanvas } from './use-resize-canvas';

type FlowCanvasProps = {
  edgeTypes?: EdgeTypes;
  nodeTypes?: NodeTypes;
  graph?: Graph;
  topOffset?: number;
  allowCanvasPanning?: boolean;
  children?: ReactNode;
  ContextMenu?: React.ComponentType<{
    contextMenuType: ContextMenuType;
    children: ReactNode;
  }>;
};

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
    ContextMenu = ({ children }) => children,
    children,
  }: FlowCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const storeApi = useStoreApi();
    const [contextMenuType, setContextMenuType] = useState<ContextMenuType>(
      ContextMenuType.CANVAS,
    );
    useResizeCanvas(containerRef);

    const onInit = useCallback(
      (reactFlow: ReactFlowInstance<WorkflowNode, Edge>) => {
        reactFlow.fitView({
          nodes: reactFlow.getNodes().slice(0, 5),
          minZoom: InitialZoom.MIN,
          maxZoom: InitialZoom.MAX,
        });
        if (topOffset) {
          const { x, zoom } = reactFlow.getViewport();
          reactFlow.setViewport({ x, y: topOffset, zoom });
        }
      },
      [topOffset],
    );

    const { readonly, panningMode, onSelectionChange, onSelectionEnd } =
      useCanvasContext();
    const inGrabPanningMode = panningMode === 'grab';

    const panOnDrag = getPanOnDrag(allowCanvasPanning, inGrabPanningMode);

    const onContextMenu = (ev: React.MouseEvent<HTMLDivElement>) => {
      if (ev.target instanceof HTMLElement || ev.target instanceof SVGElement) {
        const stepElement = ev.target.closest(
          `[data-${STEP_CONTEXT_MENU_ATTRIBUTE}]`,
        );
        const stepName = stepElement?.getAttribute(
          `data-${STEP_CONTEXT_MENU_ATTRIBUTE}`,
        );

        if (stepName) {
          const reactFlowState = storeApi.getState();
          reactFlowState.setNodes(
            reactFlowState.nodes.map((node) => ({
              ...node,
              selected: node.id === stepName,
            })),
          );
        }

        const targetIsSelectionRect = ev.target.classList.contains(
          NODE_SELECTION_RECT_CLASS_NAME,
        );
        if (stepElement || targetIsSelectionRect) {
          setContextMenuType(ContextMenuType.STEP);
        } else {
          setContextMenuType(ContextMenuType.CANVAS);
        }
        if (doesSelectionRectangleExist() && !targetIsSelectionRect) {
          document
            .querySelector(`.${NODE_SELECTION_RECT_CLASS_NAME}`)
            ?.remove();
        }
      }
    };

    return (
      <div className="size-full bg-editorBackground" ref={containerRef}>
        {!!graph && (
          <ContextMenu contextMenuType={contextMenuType}>
            <ReactFlow
              nodeTypes={nodeTypes}
              nodes={graph.nodes}
              edgeTypes={edgeTypes}
              edges={graph.edges}
              draggable={false}
              edgesFocusable={false}
              elevateEdgesOnSelect={false}
              maxZoom={MAX_ZOOM}
              minZoom={MIN_ZOOM}
              panOnDrag={panOnDrag}
              zoomOnDoubleClick={false}
              panOnScroll={true}
              fitView={false}
              nodesConnectable={false}
              elementsSelectable={true}
              nodesDraggable={false}
              nodesFocusable={false}
              selectionKeyCode={
                inGrabPanningMode && !readonly ? SHIFT_KEY : null
              }
              multiSelectionKeyCode={
                inGrabPanningMode && !readonly ? SHIFT_KEY : null
              }
              selectionOnDrag={!inGrabPanningMode && !readonly}
              proOptions={{
                hideAttribution: true,
              }}
              onInit={onInit}
              onContextMenu={onContextMenu}
              onSelectionChange={readonly ? undefined : onSelectionChange}
              onSelectionEnd={readonly ? undefined : onSelectionEnd}
            >
              <Background color="lightgray" />
              {children}
            </ReactFlow>
          </ContextMenu>
        )}
      </div>
    );
  },
);

export const doesSelectionRectangleExist = () => {
  return document.querySelector(`.${NODE_SELECTION_RECT_CLASS_NAME}`) !== null;
};

FlowCanvas.displayName = 'FlowCanvas';
export { FlowCanvas, FlowCanvasProps };
