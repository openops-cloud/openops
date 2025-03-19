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
import { Graph } from '../../lib/flow-canvas-utils';
import { useCanvasContext } from './canvas-context';
import {
  InitialZoom,
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
  ContextMenu: React.ComponentType<{
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
    ContextMenu,
    children,
  }: FlowCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const storeApi = useStoreApi();
    const [contextMenuType, setContextMenuType] = useState<ContextMenuType>(
      ContextMenuType.CANVAS,
    );
    useResizeCanvas(containerRef);

    const onInit = useCallback(
      (reactFlow: ReactFlowInstance) => {
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

    const { panningMode } = useCanvasContext();
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

        if (stepElement && stepName) {
          // todo
          // selectStepByName(stepName);
          storeApi.getState().addSelectedNodes([stepName]);
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
          // todo
          <ContextMenu contextMenuType={contextMenuType}>
            <ReactFlow
              onContextMenu={onContextMenu}
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
