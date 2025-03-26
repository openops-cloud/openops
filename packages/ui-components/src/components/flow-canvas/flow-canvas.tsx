import { Action, StepLocationRelativeToParent } from '@openops/shared';
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
import { useEffectOnce } from 'react-use';
import { Edge, Graph, WorkflowNode } from '../../lib/flow-canvas-utils';
import { useCanvasContext } from './canvas-context';
import { useClipboardContext } from './clipboard-context';
import {
  InitialZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_SELECTION_RECT_CLASS_NAME,
  PLUS_CONTEXT_MENU_ATTRIBUTE,
  PLUS_CONTEXT_MENU_BRANCH_NODE_ID_ATTRIBUTE,
  PLUS_CONTEXT_MENU_PARENT_ATTRIBUTE,
  PLUS_CONTEXT_MENU_STEP_LOCATION_ATTRIBUTE,
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
  selectStepByName?: (stepName: string) => void;
  ContextMenu?: React.ComponentType<{
    contextMenuType: ContextMenuType;
    actionToPaste: Action | null;
    children: ReactNode;
  }>;
  children?: ReactNode;
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
    selectStepByName,
    ContextMenu = ({ children }) => children,
    children,
  }: FlowCanvasProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const storeApi = useStoreApi();
    const [contextMenuType, setContextMenuType] = useState<ContextMenuType>(
      ContextMenuType.CANVAS,
    );
    const { actionToPaste, fetchClipboardOperations } = useClipboardContext();
    useResizeCanvas(containerRef);

    useEffectOnce(() => {
      fetchClipboardOperations();
    });

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

    const {
      readonly,
      panningMode,
      onSelectionChange,
      onSelectionEnd,
      pastePlusButton,
      setPastePlusButton,
    } = useCanvasContext();
    const inGrabPanningMode = panningMode === 'grab';

    const panOnDrag = getPanOnDrag(allowCanvasPanning, inGrabPanningMode);

    const onContextMenu = async (ev: React.MouseEvent<HTMLDivElement>) => {
      await fetchClipboardOperations();

      if (ev.target instanceof HTMLElement || ev.target instanceof SVGElement) {
        const stepElement = ev.target.closest(
          `[data-${STEP_CONTEXT_MENU_ATTRIBUTE}]`,
        );
        const stepName = stepElement?.getAttribute(
          `data-${STEP_CONTEXT_MENU_ATTRIBUTE}`,
        );

        const plusElement = ev.target.closest(
          `[data-${PLUS_CONTEXT_MENU_ATTRIBUTE}]`,
        );
        const plusParentStep = plusElement?.getAttribute(
          `data-${PLUS_CONTEXT_MENU_PARENT_ATTRIBUTE}`,
        );
        const plusStepLocation = plusElement?.getAttribute(
          `data-${PLUS_CONTEXT_MENU_STEP_LOCATION_ATTRIBUTE}`,
        );
        const plusBranchNodeId = plusElement?.getAttribute(
          `data-${PLUS_CONTEXT_MENU_BRANCH_NODE_ID_ATTRIBUTE}`,
        );

        if (stepName && typeof selectStepByName === 'function') {
          selectStepByName(stepName);
          const reactFlowState = storeApi.getState();
          reactFlowState.setNodes(
            reactFlowState.nodes.map((node) => ({
              ...node,
              selected: node.id === stepName,
            })),
          );
        }

        if (plusElement && plusParentStep) {
          setPastePlusButton({
            parentStep: plusParentStep,
            plusStepLocation: plusStepLocation as StepLocationRelativeToParent,
            branchNodeId: plusBranchNodeId as string | undefined,
          });
        } else if (pastePlusButton) {
          setPastePlusButton(null);
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
          <ContextMenu
            contextMenuType={contextMenuType}
            actionToPaste={actionToPaste}
          >
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
